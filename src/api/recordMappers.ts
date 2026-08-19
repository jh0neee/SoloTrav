/**
 * 여행 기록·댓글 응답 → 화면 모델 변환.
 *
 * 등록 바디는 스펙에서 확인됐지만 조회 응답은 아직 못 봐서, 목록 위치와 필드명을
 * 여러 형태로 받아둡니다. 좋아요·댓글 수는 이름을 몰라 후보를 훑고 없으면 0 입니다.
 */
import { unwrap } from './mappers';
import { env } from '../config/env';
import { photoTones } from '../theme/colors';
import type { PhotoTone } from '../theme/colors';
import type {
  RecordComment,
  TravelRecord,
  TravelRecordInput,
} from '../types/travelRecord';
import type {
  Envelope,
  RecordCommentDto,
  RecordCommentListDto,
  TravelRecordDto,
  TravelRecordListDto,
  TravelRecordRequest,
} from './dto';

const TONE_KEYS = Object.keys(photoTones) as PhotoTone[];

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return null;
}

/** 후보 중 첫 번째 유효한 숫자. 전부 없으면 0 */
function firstCount(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }
  }
  return 0;
}

/** 후보 중 첫 번째 불리언. 전부 없으면 false */
function firstFlag(...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return false;
}

function toId(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

/**
 * 이미지가 없을 때 쓰는 플레이스홀더 색을 기록 id 로 정합니다.
 * 무작위가 아니라 id 기반이라 다시 불러와도 같은 기록은 같은 색입니다.
 */
function pickTone(id: string): PhotoTone {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i)) % TONE_KEYS.length;
  }
  return TONE_KEYS[hash];
}

function toStringArray(...candidates: unknown[]): string[] {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item): item is string => typeof item === 'string' && item.length > 0,
      );
    }
  }
  return [];
}

/**
 * 서버가 준 이미지 경로를 화면에서 바로 쓸 수 있는 절대 URL 로 만듭니다.
 *
 * '/uploads/a.jpg' 같은 상대 경로를 그대로 <Image source={{uri}}> 에 넘기면
 * RN 은 아무것도 그리지 못하고 빈 칸만 남깁니다(에러도 눈에 안 띕니다).
 * API 호스트를 앞에 붙여줍니다.
 */
function toAbsoluteUrl(url: string): string {
  // 이미 절대 URL(http://, https://, //host, data:, file:) 이면 그대로 둡니다.
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(url) || /^(data|file):/i.test(url)) {
    return url;
  }
  return `${env.apiOrigin}/${url.replace(/^\/+/, '')}`;
}

/** 이미지는 문자열 배열로도, `{ url }` 객체 배열로도 올 수 있습니다. */
function toImageUrls(dto: TravelRecordDto): string[] {
  const raw = Array.isArray(dto.imageUrls)
    ? toStringArray(dto.imageUrls)
    : Array.isArray(dto.images)
    ? dto.images
        .map(item =>
          typeof item === 'string'
            ? item
            : firstString(
                item?.url,
                item?.imageUrl,
                item?.fileUrl,
                item?.filePath,
                item?.path,
                item?.src,
              ) ?? '',
        )
        .filter(url => url.length > 0)
    : [];

  return raw.map(toAbsoluteUrl);
}

/** 'YYYY-MM-DD' 만 남깁니다(서버가 ISO 로 줄 수도 있어서). */
function toDateOnly(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

function toRecord(dto: TravelRecordDto): TravelRecord | null {
  const id = toId(dto.id, dto.recordId);
  if (!id) {
    return null;
  }
  const owner = dto.user ?? dto.author;
  return {
    id,
    safetyGrade: firstString(dto.safetyGrade, dto.grade) ?? '-',
    tags: toStringArray(dto.tag, dto.tags),
    description: firstString(dto.description, dto.content) ?? '',
    date: toDateOnly(firstString(dto.date, dto.createdAt)),

    authorId: toId(owner?.id, owner?.userId, dto.userId, dto.authorId),
    authorName: firstString(
      owner?.nickname,
      owner?.nickName,
      owner?.name,
      dto.nickname,
      dto.userNickname,
    ),

    likeCount: firstCount(dto.likeCount, dto.likesCount, dto.likes),
    likedByMe: firstFlag(dto.likedByMe, dto.isLiked, dto.liked),
    commentCount: firstCount(
      dto.commentCount,
      dto.commentsCount,
      dto.comments,
    ),

    imageUrls: toImageUrls(dto),
    tone: pickTone(id),
  };
}

/** 응답 → 기록 목록. 해석할 수 없는 항목은 조용히 버립니다. */
export function toTravelRecords(payload: unknown): TravelRecord[] {
  const inner = unwrap(payload as Envelope<TravelRecordListDto>);

  const list: unknown = Array.isArray(inner)
    ? inner
    : inner.records ?? inner.items ?? inner.list ?? inner.content;

  if (!Array.isArray(list)) {
    return [];
  }

  const records = list
    .map(item => toRecord(item as TravelRecordDto))
    .filter((record): record is TravelRecord => record !== null);

  // 사진이 안 보일 때 어디까지 왔는지 보려고 남깁니다.
  // 여기 URL 이 찍히는데 화면이 비어 있다면, 앱은 제 몫을 한 것이고
  // 그 주소가 안 열리는(서버가 파일을 서빙하지 않는) 것입니다.
  if (__DEV__) {
    const urls = records.flatMap(record => record.imageUrls);
    console.log(
      `[record] 기록 ${records.length}건 / 사진 ${urls.length}장`,
      urls.length > 0 ? urls : '',
    );
  }

  return records;
}

/** 응답 → 기록 한 건. 해석할 수 없으면 null */
export function toTravelRecord(payload: unknown): TravelRecord | null {
  const inner = unwrap(payload as Envelope<TravelRecordDto>);
  return toRecord(inner);
}

/** 작성 입력값 → POST/PATCH 바디 (태그 키는 스펙대로 `tag`) */
export function toTravelRecordRequest(
  input: TravelRecordInput,
): TravelRecordRequest {
  return {
    safetyGrade: input.safetyGrade,
    tag: input.tags,
    description: input.description.trim(),
    date: input.date,
  };
}

function toComment(dto: RecordCommentDto): RecordComment | null {
  const id = toId(dto.id, dto.commentId);
  if (!id) {
    return null;
  }
  const owner = dto.user ?? dto.author;
  return {
    id,
    content: firstString(dto.content, dto.text) ?? '',
    authorId: toId(owner?.id, owner?.userId, dto.userId, dto.authorId),
    authorName: firstString(
      owner?.nickname,
      owner?.nickName,
      owner?.name,
      dto.nickname,
    ),
    createdAt: toDateOnly(firstString(dto.createdAt, dto.date)),
    likeCount: firstCount(dto.likeCount, dto.likesCount, dto.likes),
    likedByMe: firstFlag(dto.likedByMe, dto.isLiked, dto.liked),
  };
}

/** 응답 → 댓글 목록 */
export function toRecordComments(payload: unknown): RecordComment[] {
  const inner = unwrap(payload as Envelope<RecordCommentListDto>);

  const list: unknown = Array.isArray(inner)
    ? inner
    : inner.comments ?? inner.items ?? inner.list ?? inner.content;

  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map(item => toComment(item as RecordCommentDto))
    .filter((comment): comment is RecordComment => comment !== null);
}
