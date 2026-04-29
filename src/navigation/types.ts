export type YouStackParamList = {
  YouHome: undefined;
  MyDiscs: undefined;
  MyStats: undefined;
  Sessions: undefined;
  CoursesList: undefined;
  LayoutDetail: { layoutId: number };
  About: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  PracticeStart: undefined;
  PracticeThrow: {
    sessionId: number;
    layoutId: number;
    initialHoleIdx?: number;
  };
  GamePlanStart: undefined;
  GamePlanReview: { layoutId: number };
  TournamentStart: undefined;
  TournamentThrow: { sessionId: number; layoutId: number };
};
