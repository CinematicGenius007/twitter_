import { Routes, Route } from "react-router";
import { Layout } from "./components/Layout";
import { FeedPage } from "./pages/FeedPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SearchPage } from "./pages/SearchPage";
import { HashtagPage } from "./pages/HashtagPage";
import { EditProfilePage } from "./pages/EditProfilePage";
import { CompleteProfilePage } from "./pages/CompleteProfilePage";
import { TweetPage } from "./pages/TweetPage";
import { ProfilePage } from "./pages/ProfilePage";
import { FollowListPage } from "./pages/FollowListPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<FeedPage />} />
        <Route path="login/*" element={<LoginPage />} />
        <Route path="register/*" element={<RegisterPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="hashtag/:tag" element={<HashtagPage />} />
        <Route path="settings/profile" element={<EditProfilePage />} />
        <Route path="complete-profile" element={<CompleteProfilePage />} />
        <Route path=":handle/status/:id" element={<TweetPage />} />
        <Route path=":handle/readers" element={<FollowListPage kind="followers" />} />
        <Route path=":handle/reading" element={<FollowListPage kind="following" />} />
        <Route path=":handle" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
