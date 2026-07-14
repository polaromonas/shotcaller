// Single hub-and-spoke stack: Home is the root, every other screen pushes on
// top and back returns toward Home. No tab navigator.
export type RootStackParamList = {
  Home: undefined;
  MyDiscs: undefined;
  CoursesList: undefined;
  CourseAdd: undefined;
  LayoutDetail: { layoutId: number };
  LayoutEdit: { layoutId: number };
  PlanHole: { layoutId: number; holeId: number };
  PlayPicker: undefined;
  PlayLayout: { layoutId: number };
  About: undefined;
};
