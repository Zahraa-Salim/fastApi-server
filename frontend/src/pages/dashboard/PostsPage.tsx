/**
 * Posts management page.
 * Provides post listing, filtering, and full create/edit/delete management actions.
 */
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { api, ApiError } from "../../lib/api";
import { clearToken } from "../../lib/auth";
import { useDebounce } from "../../hooks/useDebounce";
import type { Author, PaginatedResponse, Post } from "../../types/api";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Pagination } from "../../components/ui/Pagination";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";

const postSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  status: z.enum(["draft", "published"]),
  author: z.number().min(1, "Author is required"),
  tagsInput: z.string().optional(),
});

type PostFormValues = z.infer<typeof postSchema>;
type ModalMode = "create" | "edit";

const DEFAULT_POST_IMAGE = "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80";

function parseTags(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function SortIcon({ order }: { order: "asc" | "desc" }) {
  return order === "asc" ? (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 18V6" />
      <path d="m7 11 5-5 5 5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 6v12" />
      <path d="m17 13-5 5-5-5" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
    </svg>
  );
}

export function PostsPage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");

  const [authors, setAuthors] = useState<Author[]>([]);
  const [data, setData] = useState<PaginatedResponse<Post> | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [detailsPost, setDetailsPost] = useState<Post | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const debouncedQuery = useDebounce(query, 250);
  const hasData = Boolean(data && data.data.length);
  const imagePreviewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ""), [imageFile]);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      sort,
      order,
      q: debouncedQuery,
      status: statusFilter,
      tag: tagFilter,
      authorId: authorFilter,
    }),
    [page, limit, sort, order, debouncedQuery, statusFilter, tagFilter, authorFilter]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      status: "draft",
      author: 0,
      tagsInput: "",
    },
  });

  const handleAuthFailure = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      clearToken();
      navigate("/login", { replace: true });
      return true;
    }
    return false;
  };

  const loadAuthors = async () => {
    try {
      const response = await api.authors.list({ page: 1, limit: 100, sort: "name", order: "asc" });
      setAuthors(response.data);
    } catch (error) {
      if (handleAuthFailure(error)) return;
      toast.error(error instanceof Error ? error.message : "Failed to load authors");
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await api.posts.list(queryParams);
      setData(response);
    } catch (error) {
      if (handleAuthFailure(error)) return;
      toast.error(error instanceof Error ? error.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAuthors();
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [queryParams]);

  useEffect(() => {
    if (!imagePreviewUrl) return;
    return () => {
      URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const resetFilters = () => {
    setPage(1);
    setQuery("");
    setStatusFilter("");
    setAuthorFilter("");
    setTagFilter("");
    setSort("created_at");
    setOrder("desc");
    setLimit(10);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingPost(null);
    setImageFile(null);
    reset({
      title: "",
      slug: "",
      content: "",
      status: "draft",
      author: authors[0]?.id || 0,
      tagsInput: "",
    });
    setFormOpen(true);
  };

  const openEditModal = (post: Post) => {
    setModalMode("edit");
    setEditingPost(post);
    setImageFile(null);
    reset({
      title: post.title,
      slug: post.slug,
      content: post.content,
      status: post.status === "published" ? "published" : "draft",
      author: post.author_id || 0,
      tagsInput: post.tags.join(", "),
    });
    setFormOpen(true);
  };

  const onSubmit = async (values: PostFormValues) => {
    try {
      const payload = {
        title: values.title,
        slug: values.slug,
        content: values.content,
        status: values.status,
        author: values.author,
        tags: parseTags(values.tagsInput),
      };

      if (modalMode === "edit" && editingPost) {
        const response = await (imageFile
          ? (() => {
              const formData = new FormData();
              formData.append("title", payload.title);
              formData.append("slug", payload.slug);
              formData.append("content", payload.content);
              formData.append("status", payload.status);
              formData.append("author", String(payload.author));
              formData.append("tags", JSON.stringify(payload.tags));
              formData.append("image", imageFile);
              return api.posts.update(editingPost.id, formData);
            })()
          : api.posts.update(editingPost.id, payload));
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            data: prev.data.map((post) => (post.id === editingPost.id ? response.data : post)),
          };
        });
        toast.success("Post updated");
      } else {
        const formData = new FormData();
        formData.append("title", payload.title);
        formData.append("slug", payload.slug);
        formData.append("content", payload.content);
        formData.append("status", payload.status);
        formData.append("author", String(payload.author));
        if (payload.tags.length) {
          formData.append("tags", JSON.stringify(payload.tags));
        }
        if (imageFile) {
          formData.append("image", imageFile);
        }
        const response = await api.posts.create(formData);
        setData((prev) => {
          if (!prev || prev.page !== 1) return prev;
          const nextData = [response.data, ...prev.data].slice(0, prev.limit);
          const total = prev.total + 1;
          return {
            ...prev,
            data: nextData,
            total,
            results: nextData.length,
            totalPages: Math.max(Math.ceil(total / prev.limit), 1),
          };
        });
        toast.success("Post created");
      }

      setFormOpen(false);
      setImageFile(null);
      if (!data) {
        await loadPosts();
      } else if (data.page !== 1) {
        await loadPosts();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save post");
    }
  };

  const onDelete = async () => {
    if (!deletingPost) return;

    try {
      await api.posts.delete(deletingPost.id);
      toast.success("Post deleted");
      setDeletingPost(null);
      setData((prev) => {
        if (!prev) return prev;
        const nextData = prev.data.filter((post) => post.id !== deletingPost.id);
        const total = Math.max(prev.total - 1, 0);
        return {
          ...prev,
          data: nextData,
          total,
          results: nextData.length,
          totalPages: Math.max(Math.ceil(total / prev.limit), 1),
        };
      });
      if (data && data.page > 1 && data.data.length === 1) {
        setPage((prevPage) => Math.max(prevPage - 1, 1));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete post");
    }
  };

  return (
    <section className="page-section page-section--scroll">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Posts</h1>
          <p className="page-header__subtitle">Manage blog posts with filters and quick actions.</p>
        </div>
        <Button onClick={openCreateModal}>Create Post</Button>
      </div>

      <div className="filters-mobile-trigger">
        <Button variant="secondary" onClick={() => setFiltersOpen(true)}>
          <span className="btn__icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5h18" />
              <path d="M6 12h12" />
              <path d="M10 19h4" />
            </svg>
          </span>
          <span>Filter</span>
        </Button>
      </div>

      <div className="filters-desktop">
        <div className="card posts-filters">
          <div className="posts-filters__search">
            <Input
              label="Search"
              placeholder="Search posts"
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
            />
          </div>

          <Select
            label="Status"
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value);
            }}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </Select>

          <Select
            label="Author"
            value={authorFilter}
            onChange={(event) => {
              setPage(1);
              setAuthorFilter(event.target.value);
            }}
          >
            <option value="">All Authors</option>
            {authors.map((author) => (
              <option key={author.id} value={String(author.id)}>
                {author.name}
              </option>
            ))}
          </Select>

          <Input
            label="Tag"
            placeholder="e.g. node"
            className="field__control--icon-tag"
            value={tagFilter}
            onChange={(event) => {
              setPage(1);
              setTagFilter(event.target.value);
            }}
          />

          <div className="posts-filters__sort-group">
            <Select
              label="Sort by"
              value={sort}
              onChange={(event) => {
                setPage(1);
                setSort(event.target.value);
              }}
            >
              <option value="created_at">Created Date</option>
              <option value="title">Title</option>
              <option value="status">Status</option>
            </Select>

            <button
              className="posts-filters__order-btn"
              type="button"
              onClick={() => {
                setPage(1);
                setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
              }}
              aria-label="Toggle sort order"
            >
              <SortIcon order={order} />
            </button>
          </div>

          <div className="posts-filters__actions">
            <Button variant="secondary" onClick={resetFilters}>
              <span className="btn__icon">
                <ResetIcon />
              </span>
              <span>Clear Filters</span>
            </Button>
          </div>
        </div>

      </div>

      <AnimatePresence>
        {filtersOpen ? (
          <motion.div
            className="sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFiltersOpen(false)}
          >
            <motion.div
              className="sheet-card"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sheet-header">
                <h3>Filters</h3>
                <button className="sheet-close" onClick={() => setFiltersOpen(false)} type="button">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </button>
              </div>

              <div className="sheet-body">
                <div className="sheet-filters">
                  <Input
                    label="Search"
                    placeholder="Search posts"
                    value={query}
                    onChange={(event) => {
                      setPage(1);
                      setQuery(event.target.value);
                    }}
                  />

                  <Select
                    label="Status"
                    value={statusFilter}
                    onChange={(event) => {
                      setPage(1);
                      setStatusFilter(event.target.value);
                    }}
                  >
                    <option value="">All</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </Select>

                  <Select
                    label="Author"
                    value={authorFilter}
                    onChange={(event) => {
                      setPage(1);
                      setAuthorFilter(event.target.value);
                    }}
                  >
                    <option value="">All Authors</option>
                    {authors.map((author) => (
                      <option key={author.id} value={String(author.id)}>
                        {author.name}
                      </option>
                    ))}
                  </Select>

                  <Input
                    label="Tag"
                    placeholder="e.g. node"
                    className="field__control--icon-tag"
                    value={tagFilter}
                    onChange={(event) => {
                      setPage(1);
                      setTagFilter(event.target.value);
                    }}
                  />

                  <div className="posts-filters__sort-group">
                    <Select
                      label="Sort by"
                      value={sort}
                      onChange={(event) => {
                        setPage(1);
                        setSort(event.target.value);
                      }}
                    >
                      <option value="created_aat">Created Date</option>
                      <option value="title">Title</option>
                      <option value="status">Status</option>
                    </Select>

                    <button
                      className="posts-filters__order-btn"
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                      }}
                      aria-label="Toggle sort order"
                    >
                      <SortIcon order={order} />
                    </button>
                  </div>

                </div>
              </div>

              <div className="sheet-actions">
                <Button
                  variant="secondary"
                  onClick={() => {
                    resetFilters();
                  }}
                >
                  Reset
                </Button>
                <Button onClick={() => setFiltersOpen(false)}>Apply</Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="card list-card list-card--posts">
        {loading && hasData ? (
          <div className="list-loading">
            <span className="spinner__dot" />
            <span>Updating posts...</span>
          </div>
        ) : null}
        <AnimatePresence mode="wait">
          {loading && !hasData ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Spinner label="Loading posts..." />
            </motion.div>
          ) : data && data.data.length ? (
            <motion.div key={`posts-${data.page}-${data.results}-${order}-${sort}-${statusFilter}-${tagFilter}-${authorFilter}-${debouncedQuery}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="posts-grid">
              {data.data.map((post) => (
                <motion.article key={post.id} layout className="post-card" onClick={() => setDetailsPost(post)}>
                  <img
                    className="post-card__image"
                    src={post.image || DEFAULT_POST_IMAGE}
                    alt={post.title}
                    onError={(event) => {
                      event.currentTarget.src = DEFAULT_POST_IMAGE;
                    }}
                  />

                  <div className="post-card__body">
                    <div className="post-card__header">
                      <div>
                        <h3 className="post-card__title">{post.title}</h3>
                        <p className="post-card__slug">/{post.slug}</p>
                      </div>
                      <span className="post-card__status">{post.status}</span>
                    </div>

                    <p className="post-card__content">{post.content}</p>

                    <div className="post-card__tags">
                      {post.tags.length ? (
                        post.tags.map((tag) => (
                          <span key={`${post.id}-${tag}`} className="post-tag">
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="info-text info-text--small info-text--muted">No tags</span>
                      )}
                    </div>

                    <div className="post-card__meta">
                      <span>Author ID: {post.author_id}</span>
                      <span>Created: {formatDate(post.created_at)}</span>
                    </div>

                    <div className="post-card__actions">
                      <Button
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(post);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeletingPost(post);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <EmptyState title="No posts found" description="Adjust filters or create a new post." />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {data ? (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={(nextPage) => setPage(nextPage)}
          disabled={loading}
        />
      ) : null}

      <Modal
        open={Boolean(detailsPost)}
        title="Post details"
        onClose={() => setDetailsPost(null)}
      >
        {detailsPost ? (
          <div className="form-stack">
            <div className="post-card post-card--modal">
              <img
                className="post-card__image"
                src={detailsPost.image || DEFAULT_POST_IMAGE}
                alt={detailsPost.title}
                onError={(event) => {
                  event.currentTarget.src = DEFAULT_POST_IMAGE;
                }}
              />
              <div className="post-card__body">
                <div className="post-details">
                  <p className="post-details__line">
                    The title is <strong>{detailsPost.title}</strong>.
                  </p>
                  <p className="post-details__line">
                    The slug is <strong>/{detailsPost.slug}</strong>.
                  </p>
                  <p className="post-details__line">The current status is {detailsPost.status}.</p>
                  <p className="post-details__line">
                    It was written by author ID {detailsPost.author_id}.
                  </p>
                  <p className="post-details__line">It was created on {formatDate(detailsPost.created_at)}.</p>
                  <p className="post-details__line">It was last updated on {formatDate(detailsPost.updated_at)}.</p>
                  <p className="post-details__line">
                    {detailsPost.published_at
                      ? `It was published on ${formatDate(detailsPost.published_at)}.`
                      : "It has not been published yet."}
                  </p>
                  <p className="post-details__line">
                    {detailsPost.tags.length
                      ? `It is tagged with ${detailsPost.tags.join(", ")}.`
                      : "It has no tags."}
                  </p>
                  <p className="post-details__line">The content is:</p>
                  <p className="post-details__content">{detailsPost.content}</p>
                </div>

                <div className="post-card__actions">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDetailsPost(null);
                      openEditModal(detailsPost);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setDetailsPost(null);
                      setDeletingPost(detailsPost);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={formOpen}
        title={modalMode === "edit" ? "Edit Post" : "Create Post"}
        onClose={() => {
          setFormOpen(false);
          setImageFile(null);
        }}
        showClose={false}
      >
        <form className="form-stack" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Title" error={errors.title?.message} {...register("title")} />
          <Input label="Slug" error={errors.slug?.message} {...register("slug")} />

          <label className="field">
            <span className="field__label">Content</span>
            <textarea
              className={["textarea-control", errors.content ? "textarea-control--error" : ""].join(" ")}
              rows={5}
              {...register("content")}
            />
            {errors.content ? <span className="field__error">{errors.content.message}</span> : null}
          </label>

          <div className="form-row">
            <Select label="Status" error={errors.status?.message} {...register("status")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>

            <Select label="Author" error={errors.author?.message} {...register("author")}>
              <option value="">Select author</option>
              {authors.map((author) => (
                <option key={author.id} value={String(author.id)}>
                  {author.name}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Tags (comma separated)"
            placeholder="react, api, dashboard"
            error={errors.tagsInput?.message}
            {...register("tagsInput")}
          />

          <label className="field">
            <span className="field__label">{modalMode === "edit" ? "Replace image (optional)" : "Image"}</span>
            <input
              className="field__control file-input"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setImageFile(file);
              }}
            />
            {imageFile ? (
              <span className="info-text info-text--small">Selected: {imageFile.name}</span>
            ) : modalMode === "edit" ? (
              <span className="info-text info-text--small">Current image will remain if no file is chosen.</span>
            ) : null}
            {modalMode === "edit" && (imagePreviewUrl || editingPost?.image) ? (
              <div className="image-preview">
                <img
                  className="image-preview__thumb"
                  src={imagePreviewUrl || editingPost?.image || DEFAULT_POST_IMAGE}
                  alt="Post preview"
                  onError={(event) => {
                    event.currentTarget.src = DEFAULT_POST_IMAGE;
                  }}
                />
                <span className="info-text info-text--small">
                  {imagePreviewUrl ? "New image preview." : "Current image preview."}
                </span>
              </div>
            ) : null}
          </label>

          <div className="form-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFormOpen(false);
                setImageFile(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {modalMode === "edit" ? "Save Changes" : "Create Post"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deletingPost)}
        title="Delete post"
        onClose={() => setDeletingPost(null)}
        showClose={false}
      >
        <div className="form-stack">
          <p className="info-text">
            Confirm deleting <span className="text-strong">{deletingPost?.title}</span>?
          </p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setDeletingPost(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onDelete}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
