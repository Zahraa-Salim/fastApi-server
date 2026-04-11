/**
 * Client posts browsing page.
 * Read-only view for clients to browse published blog posts with search and pagination.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { api, ApiError } from "../../lib/api";
import { clearToken } from "../../lib/auth";
import { useDebounce } from "../../hooks/useDebounce";
import type { PaginatedResponse, Post } from "../../types/api";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Pagination } from "../../components/ui/Pagination";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

const DEFAULT_POST_IMAGE = "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80";

export function ClientPostsPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 9;

  const debouncedQuery = useDebounce(search, 300);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      q: debouncedQuery,
      status: "published",
    }),
    [page, debouncedQuery]
  );

  const handleAuthFailure = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      clearToken();
      navigate("/login", { replace: true });
      return true;
    }
    return false;
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await api.posts.list(queryParams);
      setPosts(response.data);
      setTotalPages(response.totalPages);
    } catch (error) {
      if (handleAuthFailure(error)) return;
      toast.error(error instanceof Error ? error.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    loadPosts();
  }, [queryParams]);

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Top Navbar */}
      <nav style={{ backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border)", height: "56px", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "var(--shadow-sm)" }}>
        <h1 style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem", color: "var(--text)" }}>Verdant Blog</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link to="/client/profile" style={{ color: "var(--text-muted)", fontSize: "0.9rem", textDecoration: "none" }}>
            My Profile
          </Link>
          <Button variant="secondary" onClick={handleLogout} style={{ padding: "6px 12px", fontSize: "0.9rem" }}>
            Logout
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 16px", width: "100%" }}>
        {/* Page Header */}
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "4px", margin: 0, color: "var(--text)" }}>Latest Posts</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "20px", margin: "4px 0 20px 0" }}>
          Discover our latest articles and insights.
        </p>

        {/* Search Bar */}
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            className="field__control field__control--icon-search"
            style={{ width: "100%" }}
          />
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
            <Spinner />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState title="No posts found" description="Try adjusting your search terms." />
        ) : (
          <>
            <div className="posts-grid">
              {posts.map((post) => (
                <article key={post.id} className="post-card">
                  {/* Image */}
                  <div className="post-card__image">
                    <img src={post.image || DEFAULT_POST_IMAGE} alt={post.title} />
                  </div>

                  {/* Content */}
                  <div className="post-card__body">
                    <h3 className="post-card__title">{post.title}</h3>

                    {/* Excerpt */}
                    <p className="post-card__content">
                      {post.content.substring(0, 150)}...
                    </p>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                        {post.tags.map((tag) => (
                          <span key={tag} className="post-tag" style={{ fontSize: "0.75rem" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="post-card__meta" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {post.author_id && <span>By Author</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ marginTop: "24px", display: "flex", justifyContent: "center" }}>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
