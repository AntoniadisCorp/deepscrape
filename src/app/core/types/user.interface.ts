export type Session = {
    id: string
    auth_id: string
    username: string
    user_id: string
    auth_type: string
    expires_at: Date
    created_at: Date
}

export type Author = {
    uid: string,
    displayName: string
}