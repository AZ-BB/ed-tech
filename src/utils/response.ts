export type GeneralResponse<T> = {
    data: T;
    error: string | any | null;
}