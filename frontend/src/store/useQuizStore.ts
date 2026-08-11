import { create } from 'zustand';
import { Quiz, Question, QuizSession, InstantFeedback } from '../types';
import { api } from '../services/api';

interface QuizState {
  currentQuiz: Quiz | null;
  currentSession: QuizSession | null;
  currentIndex: number;
  selectedAnswers: Record<string, string[]>; // questionId -> selected options
  questionFeedback: Record<string, InstantFeedback>; // questionId -> instant feedback
  bookmarks: Record<string, boolean>;
  notes: Record<string, string>;
  questionTimes: Record<string, number>; // questionId -> time spent in seconds
  isSubmitted: boolean;
  isLoading: boolean;

  startQuiz: (quiz: Quiz) => Promise<void>;
  loadAndStartQuiz: (quizId: string) => Promise<Quiz | null>;
  selectOption: (questionId: string, optionKey: string, isMultiSelect?: boolean) => void;
  submitCurrentAnswer: () => Promise<InstantFeedback | null>;
  nextQuestion: () => void;
  prevQuestion: () => void;
  toggleBookmark: (questionId: string) => void;
  setNote: (questionId: string, note: string) => void;
  completeQuiz: () => Promise<QuizSession | null>;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  currentQuiz: null,
  currentSession: null,
  currentIndex: 0,
  selectedAnswers: {},
  questionFeedback: {},
  bookmarks: {},
  notes: {},
  questionTimes: {},
  isSubmitted: false,
  isLoading: false,

  startQuiz: async (quiz: Quiz) => {
    set({ isLoading: true });
    try {
      const session = await api.startSession(quiz.id);
      set({
        currentQuiz: quiz,
        currentSession: session,
        currentIndex: 0,
        selectedAnswers: {},
        questionFeedback: {},
        bookmarks: {},
        notes: {},
        questionTimes: {},
        isSubmitted: false,
        isLoading: false,
      });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  loadAndStartQuiz: async (quizId: string) => {
    set({ isLoading: true });
    try {
      const quiz = await api.getQuiz(quizId);
      if (!quiz) {
        set({ isLoading: false });
        return null;
      }
      const session = await api.startSession(quiz.id);
      set({
        currentQuiz: quiz,
        currentSession: session,
        currentIndex: 0,
        selectedAnswers: {},
        questionFeedback: {},
        bookmarks: {},
        notes: {},
        questionTimes: {},
        isSubmitted: false,
        isLoading: false,
      });
      return quiz;
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  selectOption: (questionId: string, optionKey: string, isMultiSelect = false) => {
    const current = get().selectedAnswers[questionId] || [];
    let updated: string[];

    if (isMultiSelect) {
      updated = current.includes(optionKey)
        ? current.filter((k) => k !== optionKey)
        : [...current, optionKey];
    } else {
      updated = [optionKey];
    }

    set((state) => ({
      selectedAnswers: { ...state.selectedAnswers, [questionId]: updated },
    }));
  },

  submitCurrentAnswer: async () => {
    const { currentQuiz, currentSession, currentIndex, selectedAnswers, bookmarks, notes, questionTimes } = get();
    if (!currentQuiz || !currentSession || !currentQuiz.questions) return null;

    const question = currentQuiz.questions[currentIndex];
    if (!question || !question.id) return null;

    const selected = selectedAnswers[question.id] || [];
    const timeSpent = questionTimes[question.id] || 5;

    try {
      const qId = question.id;
      const feedback = await api.submitAnswer(currentSession.id, {
        question_id: qId,
        selected_options: selected,
        response_time_seconds: timeSpent,
        bookmark: !!bookmarks[qId],
        notes: notes[qId] || '',
      });

      set((state) => ({
        questionFeedback: { ...state.questionFeedback, [qId]: feedback },
      }));

      return feedback;
    } catch (err) {
      console.error('Failed to submit answer:', err);
      return null;
    }
  },

  nextQuestion: () => {
    const { currentQuiz, currentIndex } = get();
    if (currentQuiz && currentQuiz.questions && currentIndex < currentQuiz.questions.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  prevQuestion: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },

  toggleBookmark: (questionId: string) => {
    set((state) => ({
      bookmarks: { ...state.bookmarks, [questionId]: !state.bookmarks[questionId] },
    }));
  },

  setNote: (questionId: string, note: string) => {
    set((state) => ({
      notes: { ...state.notes, [questionId]: note },
    }));
  },

  completeQuiz: async () => {
    const { currentSession } = get();
    if (!currentSession) return null;
    set({ isLoading: true });
    try {
      const completed = await api.completeSession(currentSession.id);
      set({ currentSession: completed, isSubmitted: true, isLoading: false });
      return completed;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  resetQuiz: () => {
    set({
      currentQuiz: null,
      currentSession: null,
      currentIndex: 0,
      selectedAnswers: {},
      questionFeedback: {},
      bookmarks: {},
      notes: {},
      questionTimes: {},
      isSubmitted: false,
      isLoading: false,
    });
  },
}));
