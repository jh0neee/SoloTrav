/**
 * 여행 기록 스토어.
 *
 * 전체 목록과 내 목록을 한 스토어에서 함께 들고 있습니다. 둘은 같은 자원이고
 * 기록을 등록·수정·삭제하면 양쪽 다 갱신돼야 해서, 스토어를 나누면 어느 쪽을
 * 다시 부를지 화면이 알아야 합니다. 여기서 처리하면 화면은 모릅니다.
 *
 * 좋아요만 예외적으로 낙관적 갱신(먼저 화면을 바꾸고 서버에 보냄)을 합니다.
 * 응답을 기다렸다 하트를 칠하면 눌린 느낌이 나지 않기 때문입니다. 실패하면
 * 되돌립니다.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { recordApi } from '../api/recordApi';
import { toApiError } from '../api/errors';
import type { UploadImage } from '../api/recordApi';
import type { TravelRecord, TravelRecordInput } from '../types/travelRecord';

/** 전체 피드 / 내 기록 */
export type RecordScope = 'all' | 'mine';

export type RecordListState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  records: TravelRecord[];
  error: string | null;
};

export type RecordState = {
  all: RecordListState;
  mine: RecordListState;
  isSubmitting: boolean;
  submitError: string | null;
};

/**
 * 기록 등록·수정 결과.
 *
 * 사진 업로드(POST .../images)는 기록 저장과 별개의 요청이라 따로 실패할 수
 * 있습니다. 이때 전체를 실패로 던지면 작성 화면이 열린 채 남고, 사용자가 다시
 * 누르면 같은 기록이 두 번 올라갑니다. 그래서 "기록은 됐지만 사진은 실패" 는
 * 던지지 않고 이 값으로 알립니다.
 */
export type RecordSubmitResult = {
  imageError: string | null;
};

const EMPTY_LIST: RecordListState = {
  status: 'idle',
  records: [],
  error: null,
};

const INITIAL: RecordState = {
  all: EMPTY_LIST,
  mine: EMPTY_LIST,
  isSubmitting: false,
  submitError: null,
};

let state: RecordState = INITIAL;
const listeners = new Set<() => void>();

/** 스냅샷 참조가 바뀌어야 구독자가 다시 그립니다. 항상 새 객체로 교체합니다. */
function setState(patch: Partial<RecordState>): void {
  state = { ...state, ...patch };
  listeners.forEach(listener => listener());
}

function setList(scope: RecordScope, patch: Partial<RecordListState>): void {
  setState({ [scope]: { ...state[scope], ...patch } } as Partial<RecordState>);
}

/** 두 목록 모두에서 같은 기록을 찾아 바꿉니다(같은 글이 양쪽에 있을 수 있습니다). */
function patchRecordEverywhere(
  recordId: string,
  change: (record: TravelRecord) => TravelRecord,
): void {
  const apply = (list: RecordListState): RecordListState => ({
    ...list,
    records: list.records.map(record =>
      record.id === recordId ? change(record) : record,
    ),
  });
  setState({ all: apply(state.all), mine: apply(state.mine) });
}

function removeRecordEverywhere(recordId: string): void {
  const apply = (list: RecordListState): RecordListState => ({
    ...list,
    records: list.records.filter(record => record.id !== recordId),
  });
  setState({ all: apply(state.all), mine: apply(state.mine) });
}

/** 목록별로 진행 중인 조회를 공유해 중복 요청을 막습니다. */
const inFlight: Record<RecordScope, Promise<void> | null> = {
  all: null,
  mine: null,
};

/** 등록·수정·삭제 후 두 목록을 함께 다시 받습니다. */
function reloadBoth(): Promise<void[]> {
  return Promise.all([
    recordStore.reload('all'),
    recordStore.reload('mine'),
  ]);
}

/**
 * 등록 응답에 id 가 없을 때의 대비책.
 * 내 기록을 다시 받아 방금 보낸 것과 같은 기록을 찾습니다.
 * (같은 날짜에 똑같은 본문을 연달아 올리지 않는 한 어긋나지 않습니다)
 */
async function findJustCreated(
  input: TravelRecordInput,
): Promise<string | null> {
  await recordStore.reload('mine');
  const description = input.description.trim();
  const match = state.mine.records.find(
    record => record.date === input.date && record.description === description,
  );
  return match?.id ?? null;
}

/**
 * 저장된 기록에 사진을 붙입니다(POST /travel-records/{recordId}/images).
 * 실패해도 던지지 않고 메시지를 돌려줍니다 — 이유는 RecordSubmitResult 주석 참고.
 */
async function attachImages(
  recordId: string | null,
  images: UploadImage[],
): Promise<string | null> {
  if (images.length === 0) {
    return null;
  }
  if (!recordId) {
    return '기록은 저장됐지만 사진을 붙일 기록을 찾지 못했습니다.\n기록 수정에서 사진만 다시 올려주세요.';
  }
  try {
    await recordApi.uploadImages(recordId, images);
    return null;
  } catch (caught) {
    return `기록은 저장됐지만 사진 업로드에 실패했습니다.\n${
      toApiError(caught).message
    }`;
  }
}

export const recordStore = {
  get(): RecordState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** 목록에서 기록 하나를 찾습니다(상세 화면이 최신 값을 읽는 통로). */
  find(recordId: string): TravelRecord | null {
    return (
      state.all.records.find(record => record.id === recordId) ??
      state.mine.records.find(record => record.id === recordId) ??
      null
    );
  },

  ensureLoaded(scope: RecordScope): Promise<void> {
    if (state[scope].status === 'ready' || inFlight[scope]) {
      return inFlight[scope] ?? Promise.resolve();
    }
    return recordStore.reload(scope);
  },

  reload(scope: RecordScope): Promise<void> {
    setList(scope, { status: 'loading', error: null });
    const request = (async () => {
      try {
        const records =
          scope === 'mine'
            ? await recordApi.listMine()
            : await recordApi.list();
        setList(scope, { status: 'ready', records });
      } catch (caught) {
        setList(scope, {
          status: 'error',
          error: toApiError(caught).message,
        });
      } finally {
        inFlight[scope] = null;
      }
    })();
    inFlight[scope] = request;
    return request;
  },

  /**
   * 기록 등록. 성공하면 두 목록을 모두 다시 받습니다.
   * (서버가 붙인 id·작성자를 정확히 반영하려면 직접 끼워 넣는 것보다 확실합니다)
   *
   * 사진이 있으면 등록 응답의 id 로 이어서 업로드합니다. 등록 → 업로드 순서인
   * 이유는 이미지 API 가 recordId 를 경로에 요구하기 때문입니다.
   *
   * 기록 저장 실패는 던집니다 — 작성 화면이 닫히지 않고 에러를 보여줘야 하기
   * 때문입니다. 사진만 실패한 경우는 던지지 않고 결과로 돌려줍니다.
   */
  async create(
    input: TravelRecordInput,
    images: UploadImage[] = [],
  ): Promise<RecordSubmitResult> {
    setState({ isSubmitting: true, submitError: null });
    try {
      const created = await recordApi.create(input);
      const imageError =
        images.length > 0
          ? await attachImages(
              created?.id ?? (await findJustCreated(input)),
              images,
            )
          : null;
      // 목록을 다시 받는 동안에도 버튼은 잠가둡니다.
      // 먼저 풀어주면 "올리는 중..." 이 사라졌다가 화면이 닫혀 깜빡입니다.
      await reloadBoth();
      setState({ isSubmitting: false });
      return { imageError };
    } catch (caught) {
      const error = toApiError(caught);
      setState({ isSubmitting: false, submitError: error.message });
      throw error;
    }
  },

  /**
   * 기록 수정. 사진을 새로 골랐으면 기존 사진에 이어 붙입니다.
   * (서버에 이미지 삭제 API 가 없어 이미 올라간 사진을 지우지는 못합니다)
   */
  async update(
    recordId: string,
    input: TravelRecordInput,
    images: UploadImage[] = [],
  ): Promise<RecordSubmitResult> {
    setState({ isSubmitting: true, submitError: null });
    try {
      await recordApi.update(recordId, input);
      const imageError = await attachImages(recordId, images);
      await reloadBoth();
      setState({ isSubmitting: false });
      return { imageError };
    } catch (caught) {
      const error = toApiError(caught);
      setState({ isSubmitting: false, submitError: error.message });
      throw error;
    }
  },

  /**
   * 기록 삭제.
   * 목록에서 먼저 빼서 화면이 즉시 반응하게 하고, 이어서 서버 기준으로 맞춥니다.
   */
  async remove(recordId: string): Promise<void> {
    const snapshot = { all: state.all, mine: state.mine };
    removeRecordEverywhere(recordId);
    try {
      await recordApi.remove(recordId);
      await reloadBoth();
    } catch (caught) {
      // 실패하면 지우기 전으로 되돌립니다.
      setState(snapshot);
      throw toApiError(caught);
    }
  },

  /**
   * 좋아요 토글 (낙관적 갱신).
   * 실패하면 원래 상태로 되돌립니다.
   */
  async toggleLike(recordId: string): Promise<void> {
    const current = recordStore.find(recordId);
    if (!current) {
      return;
    }
    const nextLiked = !current.likedByMe;

    patchRecordEverywhere(recordId, record => ({
      ...record,
      likedByMe: nextLiked,
      likeCount: Math.max(0, record.likeCount + (nextLiked ? 1 : -1)),
    }));

    try {
      if (nextLiked) {
        await recordApi.like(recordId);
      } else {
        await recordApi.unlike(recordId);
      }
    } catch (caught) {
      patchRecordEverywhere(recordId, record => ({
        ...record,
        likedByMe: current.likedByMe,
        likeCount: current.likeCount,
      }));
      throw toApiError(caught);
    }
  },

  /** 댓글 수가 바뀌었을 때 목록의 표시를 맞춥니다(상세 화면이 알려줍니다). */
  setCommentCount(recordId: string, count: number): void {
    patchRecordEverywhere(recordId, record => ({
      ...record,
      commentCount: count,
    }));
  },

  /** 작성 화면을 새로 열 때 이전 실패 메시지를 지웁니다. */
  clearSubmitError(): void {
    setState({ submitError: null });
  },

  /** 로그아웃 시 초기화 */
  reset(): void {
    inFlight.all = null;
    inFlight.mine = null;
    setState(INITIAL);
  },
};

/** 기록 상태를 구독합니다. 지정한 목록을 처음 쓰는 시점에 한 번 조회합니다. */
export function useRecords(scope: RecordScope): RecordState {
  const snapshot = useSyncExternalStore(
    recordStore.subscribe,
    recordStore.get,
  );

  useEffect(() => {
    recordStore.ensureLoaded(scope);
  }, [scope]);

  return snapshot;
}

/** 목록에 담긴 기록 한 건을 구독합니다(상세 화면용). 없으면 null */
export function useRecord(recordId: string): TravelRecord | null {
  const snapshot = useSyncExternalStore(
    recordStore.subscribe,
    recordStore.get,
  );
  return (
    snapshot.all.records.find(record => record.id === recordId) ??
    snapshot.mine.records.find(record => record.id === recordId) ??
    null
  );
}

/**
 * 내 기록인지 구독합니다.
 *
 * 작성자(authorId)만으로 판단하지 않는 이유: 전체 피드 응답에 작성자가 실려
 * 오지 않으면 authorId 가 null 이라 내 글도 남의 글로 보여, 수정·삭제 버튼이
 * 영영 뜨지 않습니다. GET /travel-records/me 로 받은 목록은 정의상 전부 내
 * 글이니, 그 목록에 있는지로 판단하는 편이 확실합니다.
 *
 * 전체 피드에서 곧바로 상세로 들어온 경우에도 답을 낼 수 있게 내 기록을 한 번
 * 당겨옵니다(이미 받아뒀으면 ensureLoaded 가 그냥 돌아옵니다).
 */
export function useIsMyRecord(recordId: string): boolean {
  const snapshot = useSyncExternalStore(
    recordStore.subscribe,
    recordStore.get,
  );

  useEffect(() => {
    recordStore.ensureLoaded('mine');
  }, []);

  return snapshot.mine.records.some(record => record.id === recordId);
}
