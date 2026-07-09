import { BottomNav } from "@/components/dashboard/bottom-nav";
import { IntranetFeed } from "@/components/dashboard/intranet-feed";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { RightSidebar } from "@/components/dashboard/right-sidebar";
import { TopNav } from "@/components/dashboard/top-nav";
import {
  announcements,
  birthdays,
  currentUser,
  feedPosts,
  groups,
  socialNavigation,
  systemNotices
} from "@/lib/mock-data";

export default function SocialPage() {
  return (
    <div className="office-shell">
      <TopNav user={currentUser} />
      <main className="office-layout social-layout" aria-label="Bảng tin Helios Office">
        <LeftSidebar
          user={currentUser}
          navigation={socialNavigation}
          systemNotices={systemNotices}
        />

        <section className="main-column social-feed-column" aria-labelledby="feed-title">
          <IntranetFeed posts={feedPosts} />
        </section>

        <RightSidebar
          announcements={announcements}
          birthdays={birthdays}
          groups={groups}
        />
      </main>
      <BottomNav />
    </div>
  );
}
