"use client";

import { useState } from "react";

type PostCardProps = {
  post: {
    id: string;
    body: string;
    createdAt: string | Date;
    authorProfile: {
      handle: string;
      headline: string | null;
      profilePhotoUrl: string | null;
      user: { name: string };
    };
    _count: { likes: number; comments: number };
  };
  likedByMe: boolean;
  currentUserId: string;
};

export default function PostCard({ post, likedByMe, currentUserId: _currentUserId }: PostCardProps) {
  const [liked, setLiked] = useState(likedByMe);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [toggling, setToggling] = useState(false);

  async function toggleLike() {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/network/posts/${post.id}/like`, { method: "POST" });
      if (res.ok) {
        const { data } = await res.json();
        setLiked(data.liked);
        setLikeCount((c) => (data.liked ? c + 1 : c - 1));
      }
    } finally {
      setToggling(false);
    }
  }

  const initials = post.authorProfile.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const dateStr = new Date(post.createdAt).toLocaleDateString();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <a href={`/n/${post.authorProfile.handle}`} className="shrink-0">
          {post.authorProfile.profilePhotoUrl ? (
            <img
              src={post.authorProfile.profilePhotoUrl}
              alt={post.authorProfile.user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
              {initials}
            </div>
          )}
        </a>
        <div className="min-w-0">
          <a
            href={`/n/${post.authorProfile.handle}`}
            className="font-semibold text-gray-900 text-sm hover:underline"
          >
            {post.authorProfile.user.name}
          </a>
          {post.authorProfile.headline && (
            <p className="text-xs text-gray-500 truncate">{post.authorProfile.headline}</p>
          )}
          <p className="text-xs text-gray-400">{dateStr}</p>
        </div>
      </div>

      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{post.body}</p>

      <div className="flex items-center gap-4 pt-1 border-t border-gray-100">
        <button
          onClick={toggleLike}
          disabled={toggling}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            liked ? "text-blue-600" : "text-gray-500 hover:text-blue-600"
          }`}
        >
          <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          {likeCount}
        </button>
        <a
          href={`/n/posts/${post.id}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {post._count.comments}
        </a>
      </div>
    </div>
  );
}
