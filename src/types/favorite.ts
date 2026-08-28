import type { TravelCourse } from './assistant';

export type AiRouteFavorite = {
  id: string;
  requestId: string | null;
  title: string | null;
  summary: string | null;
  createdAt: string | null;
  course: TravelCourse | null;
};
