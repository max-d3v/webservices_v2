//Types
export type WebServiceResponse<T> = {
    data: Array<Partial<T>>
}

export type SapClientResponse = {
    status: boolean;
    message: string;
    details: any;
}

// Success response for actions (partial data updates)
export type ActionResponse<T> = SapClientResponse & {
    status: true;
    details: Partial<T>;
}

// Success response for fetching complete records
export type GetResponse<T> = Omit<SapClientResponse, "details"> & {
    status: true;
    data: T;
}

// Error response type
export type SapClientError = SapClientResponse & {
    status: false;
    statusCode: number;
    details: any;
}
