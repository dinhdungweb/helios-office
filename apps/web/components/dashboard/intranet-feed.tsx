import {
  ChatCircleText,
  DotsThree,
  Paperclip,
  PaperPlaneTilt,
  ShareFat,
  Smiley,
  ThumbsUp,
  SpeakerHigh
} from "@/lib/icons";
import type { FeedPost } from "@/lib/mock-data";

type IntranetFeedProps = {
  posts: FeedPost[];
};

export function IntranetFeed({ posts }: IntranetFeedProps) {
  return (
    <section className="feed-section" aria-labelledby="feed-title">
      <h1 className="sr-only" id="feed-title">Bảng tin công ty</h1>

      <div className="post-list">
        {posts.map((post) => (
          <article className="post-card" key={post.id} aria-labelledby={`${post.id}-title`}>
            <header className="post-header">
              <span className="avatar avatar--square">{post.avatar}</span>
              <div>
                <strong>{post.author}</strong>
                <p>
                  {post.role} · {post.timestamp} · {post.scope}
                </p>
              </div>
              <div className="post-tools" aria-label="Tác vụ bài viết">
                <button className="icon-button" type="button" aria-label="Nghe thông báo">
                  <SpeakerHigh size={16} weight="duotone" aria-hidden="true" />
                </button>
                <button className="icon-button" type="button" aria-label="Mở tùy chọn bài viết">
                  <DotsThree size={17} weight="duotone" aria-hidden="true" />
                </button>
              </div>
            </header>

            <h3 id={`${post.id}-title`}>{post.title}</h3>
            <p>{post.body}</p>
            <div className="tag-row" aria-label="Chủ đề">
              {post.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            <div className="post-stats">
              <span>
                <ThumbsUp size={16} weight="duotone" aria-hidden="true" /> {post.reactions}
              </span>
              <span>{post.comments} bình luận</span>
            </div>

            <footer className="post-actions">
              <button type="button">
                <ThumbsUp size={17} weight="duotone" aria-hidden="true" />
                Thích
              </button>
              <button type="button">
                <ChatCircleText size={17} weight="duotone" aria-hidden="true" />
                Bình luận
              </button>
              <button type="button">
                <ShareFat size={17} weight="duotone" aria-hidden="true" />
                Chia sẻ
              </button>
            </footer>

            <form className="comment-composer" aria-label={`Bình luận bài ${post.title}`}>
              <span className="avatar">DD</span>
              <label className="sr-only" htmlFor={`${post.id}-comment`}>
                Viết thảo luận
              </label>
              <input id={`${post.id}-comment`} placeholder="Viết thảo luận..." />
              <button className="icon-button" type="button" aria-label="Đính kèm tệp">
                <Paperclip size={16} weight="duotone" aria-hidden="true" />
              </button>
              <button className="icon-button" type="button" aria-label="Thêm cảm xúc">
                <Smiley size={16} weight="duotone" aria-hidden="true" />
              </button>
              <button className="icon-button" type="submit" aria-label="Gửi bình luận">
                <PaperPlaneTilt size={16} weight="duotone" aria-hidden="true" />
              </button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
