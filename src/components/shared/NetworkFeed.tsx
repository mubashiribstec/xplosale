"use client";

import PostCard from "./PostCard";
import CreatePostForm from "./CreatePostForm";

type PostWithMeta = {
  id: string;
  body: string;
  createdAt: string | Date;
  authorProfile: {
    handle: string;
    headline: string | null;
    profilePhotoUrl: string | null;
    user: { name: string | null };
  };
  _count: { likes: number; comments: number };
  likedByMe: boolean;
};

type NetworkFeedProps = {
  posts: PostWithMeta[];
  currentUserId: string;
  ownProfileId: string;
};

export default function NetworkFeed({ posts, currentUserId, ownProfileId }: NetworkFeedProps) {
  return (
    <div className="space-y-4">
      <CreatePostForm profileId={ownProfileId} />
      {posts.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">
          No posts yet. Connect with people or share something!
        </div>
      )}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} likedByMe={post.likedByMe} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
