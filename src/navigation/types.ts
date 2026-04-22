export type CoursesStackParamList = {
  CoursesList: undefined;
  LayoutDetail: { layoutId: number };
};

export type RootStackParamList = {
  Tabs: undefined;
  PracticeStart: undefined;
  PracticeThrow: { sessionId: number; layoutId: number };
  GamePlanStart: undefined;
  GamePlanReview: { layoutId: number };
  TournamentStart: undefined;
  TournamentThrow: { sessionId: number; layoutId: number };
};
