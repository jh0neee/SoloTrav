/**
 * 여행 기록 API (기록 CRUD + 좋아요 + 댓글).
 *
 * 조회(GET /travel-records)는 스펙상 자물쇠가 없어 비로그인도 가능해 보이지만,
 * apiClient 는 토큰이 있으면 알아서 싣고 없으면 안 싣기 때문에 그대로 써도
 * 양쪽 모두 동작합니다.
 */
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import {
  toRecordComments,
  toTravelRecord,
  toTravelRecordRequest,
  toTravelRecords,
} from './recordMappers';
import type { CommentRequest } from './dto';
import type {
  RecordComment,
  TravelRecord,
  TravelRecordInput,
} from '../types/travelRecord';

/** 업로드할 이미지 한 장 (RN 이미지 피커가 주는 형태) */
export type UploadImage = {
  uri: string;
  name: string;
  type: string;
};

export const recordApi = {
  /** GET /travel-records — 전체 여행 기록 조회 */
  list: async (): Promise<TravelRecord[]> => {
    const { data } = await apiClient.get(ENDPOINTS.travelRecords());
    return toTravelRecords(data);
  },

  /** GET /travel-records/me — 내 여행 기록 조회 */
  listMine: async (): Promise<TravelRecord[]> => {
    const { data } = await apiClient.get(ENDPOINTS.myTravelRecords());
    return toTravelRecords(data);
  },

  /**
   * POST /travel-records — 여행 기록 등록.
   * 서버가 만든 기록을 돌려주면 그걸 씁니다(이미지 업로드에 id 가 필요합니다).
   */
  create: async (input: TravelRecordInput): Promise<TravelRecord | null> => {
    const { data } = await apiClient.post(
      ENDPOINTS.travelRecords(),
      toTravelRecordRequest(input),
    );
    return toTravelRecord(data);
  },

  /** PATCH /travel-records/{recordId} — 여행 기록 수정 */
  update: async (
    recordId: string,
    input: TravelRecordInput,
  ): Promise<void> => {
    await apiClient.patch(
      ENDPOINTS.travelRecord(recordId),
      toTravelRecordRequest(input),
    );
  },

  /** DELETE /travel-records/{recordId} — 여행 기록 삭제 */
  remove: async (recordId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.travelRecord(recordId));
  },

  /**
   * POST /travel-records/{recordId}/images — 이미지 업로드 (multipart/form-data).
   *
   * Content-Type 을 이 요청에서만 multipart/form-data 로 덮어씁니다. 생략하면
   * 안 됩니다 — apiClient 의 기본 헤더가 application/json 이라, axios 가 그걸
   * 보고 FormData 를 multipart 대신 JSON 으로 직렬화해 보냅니다(요청은 200 처럼
   * 보여도 파일이 안 올라갑니다). axios/lib/defaults/index.js 의 transformRequest
   * 참고.
   *
   * boundary 는 여기서 붙이지 않습니다. RN 의 네이티브 네트워킹 계층이 FormData
   * 를 조립하면서 boundary 가 포함된 값으로 이 헤더를 다시 채워줍니다.
   */
  uploadImages: async (
    recordId: string,
    images: UploadImage[],
  ): Promise<void> => {
    const form = new FormData();
    images.forEach(image => {
      // RN 에서는 File 대신 { uri, name, type } 객체를 넣습니다.
      form.append('images', image as unknown as Blob);
    });
    await apiClient.post(ENDPOINTS.travelRecordImages(recordId), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** POST /travel-records/{recordId}/likes — 피드 좋아요 */
  like: async (recordId: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.recordLikes(recordId));
  },

  /** DELETE /travel-records/{recordId}/likes — 피드 좋아요 취소 */
  unlike: async (recordId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.recordLikes(recordId));
  },

  /** GET /travel-records/{recordId}/comments — 댓글 조회 */
  listComments: async (recordId: string): Promise<RecordComment[]> => {
    const { data } = await apiClient.get(ENDPOINTS.recordComments(recordId));
    return toRecordComments(data);
  },

  /** POST /travel-records/{recordId}/comments — 댓글 등록 */
  createComment: async (recordId: string, content: string): Promise<void> => {
    const body: CommentRequest = { content: content.trim() };
    await apiClient.post(ENDPOINTS.recordComments(recordId), body);
  },

  /** PATCH /travel-records/comments/{commentId} — 댓글 수정 */
  updateComment: async (commentId: string, content: string): Promise<void> => {
    const body: CommentRequest = { content: content.trim() };
    await apiClient.patch(ENDPOINTS.comment(commentId), body);
  },

  /** DELETE /travel-records/comments/{commentId} — 댓글 삭제 */
  removeComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.comment(commentId));
  },

  /** POST /travel-records/comments/{commentId}/likes — 댓글 좋아요 */
  likeComment: async (commentId: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.commentLikes(commentId));
  },

  /** DELETE /travel-records/comments/{commentId}/likes — 댓글 좋아요 취소 */
  unlikeComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.commentLikes(commentId));
  },
};
