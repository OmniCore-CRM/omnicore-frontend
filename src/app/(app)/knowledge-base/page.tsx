"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createWidgetArticle,
  createWidgetArticleCategory,
  deleteWidgetArticleCategory,
  listWidgetArticleCategories,
  listWidgetArticles,
  listWidgetInstallations,
  updateWidgetArticle,
  updateWidgetArticleCategory,
  updateWidgetArticleStatus,
} from "@/api/widget";
import { getErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/constants/query-keys";
import { Permissions, hasPermission, roleLabel } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import type {
  WidgetArticle,
  WidgetArticleCategory,
  WidgetArticleStatus,
} from "@/types/models";

const emptyCategoryForm = {
  name: "",
  slug: "",
  sortOrder: "0",
};

const emptyArticleForm = {
  title: "",
  slug: "",
  summary: "",
  content: "",
  categoryId: "",
  sortOrder: "0",
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function statusTone(status: WidgetArticleStatus): "success" | "warning" | "neutral" {
  if (status === "PUBLISHED") return "success";
  if (status === "ARCHIVED") return "neutral";
  return "warning";
}

export default function KnowledgeBasePage() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [selectedInstallationId, setSelectedInstallationId] = useState("");
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [articleForm, setArticleForm] = useState(emptyArticleForm);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | WidgetArticleStatus>("ALL");

  const canManage = hasPermission(user?.role, Permissions.manageKnowledgeBase);
  const canAdmin =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "OWNER" ||
    user?.role === "ADMIN";

  const installationsQuery = useQuery({
    queryKey: queryKeys.widgetInstallations,
    enabled: Boolean(token) && canManage,
    queryFn: () => listWidgetInstallations(token!),
  });

  const activeInstallationId =
    selectedInstallationId || installationsQuery.data?.[0]?.id || "";

  const categoriesQuery = useQuery({
    queryKey: queryKeys.widgetArticleCategories(activeInstallationId || "none"),
    enabled: Boolean(token) && Boolean(activeInstallationId) && canManage,
    queryFn: () => listWidgetArticleCategories(token!, activeInstallationId),
  });

  const articlesQuery = useQuery({
    queryKey: queryKeys.widgetArticles(activeInstallationId || "none"),
    enabled: Boolean(token) && Boolean(activeInstallationId) && canManage,
    queryFn: () => listWidgetArticles(token!, activeInstallationId),
  });

  const filteredArticles = useMemo(() => {
    const items = articlesQuery.data ?? [];
    if (statusFilter === "ALL") return items;
    return items.filter((article) => article.status === statusFilter);
  }, [articlesQuery.data, statusFilter]);

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      createWidgetArticleCategory(token!, activeInstallationId, {
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim(),
        sortOrder: Number(categoryForm.sortOrder || "0"),
      }),
    onSuccess: () => {
      toast.success("Category created");
      setCategoryForm(emptyCategoryForm);
      queryClient.invalidateQueries({ queryKey: queryKeys.widgetArticleCategories(activeInstallationId) });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not create category")),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: () =>
      updateWidgetArticleCategory(token!, activeInstallationId, editingCategoryId!, {
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim(),
        sortOrder: Number(categoryForm.sortOrder || "0"),
      }),
    onSuccess: () => {
      toast.success("Category updated");
      setEditingCategoryId(null);
      setCategoryForm(emptyCategoryForm);
      queryClient.invalidateQueries({ queryKey: queryKeys.widgetArticleCategories(activeInstallationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.widgetArticles(activeInstallationId) });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not update category")),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) =>
      deleteWidgetArticleCategory(token!, activeInstallationId, categoryId),
    onSuccess: () => {
      toast.success("Category deleted");
      setDeleteCategoryId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.widgetArticleCategories(activeInstallationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.widgetArticles(activeInstallationId) });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not delete category")),
  });

  const createArticleMutation = useMutation({
    mutationFn: () =>
      createWidgetArticle(token!, activeInstallationId, {
        title: articleForm.title.trim(),
        slug: articleForm.slug.trim(),
        summary: articleForm.summary.trim(),
        content: articleForm.content.trim(),
        categoryId: articleForm.categoryId || null,
        sortOrder: Number(articleForm.sortOrder || "0"),
      }),
    onSuccess: () => {
      toast.success("Article created");
      setArticleForm(emptyArticleForm);
      queryClient.invalidateQueries({ queryKey: queryKeys.widgetArticles(activeInstallationId) });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not create article")),
  });

  const updateArticleMutation = useMutation({
    mutationFn: () =>
      updateWidgetArticle(token!, activeInstallationId, editingArticleId!, {
        title: articleForm.title.trim(),
        slug: articleForm.slug.trim(),
        summary: articleForm.summary.trim(),
        content: articleForm.content.trim(),
        categoryId: articleForm.categoryId || null,
        sortOrder: Number(articleForm.sortOrder || "0"),
      }),
    onSuccess: () => {
      toast.success("Article updated");
      setEditingArticleId(null);
      setArticleForm(emptyArticleForm);
      queryClient.invalidateQueries({ queryKey: queryKeys.widgetArticles(activeInstallationId) });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not update article")),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ articleId, status }: { articleId: string; status: "PUBLISHED" | "ARCHIVED" }) =>
      updateWidgetArticleStatus(token!, activeInstallationId, articleId, status),
    onSuccess: (_, variables) => {
      toast.success(variables.status === "PUBLISHED" ? "Article published" : "Article archived");
      queryClient.invalidateQueries({ queryKey: queryKeys.widgetArticles(activeInstallationId) });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not update article status")),
  });

  const categoryPending =
    createCategoryMutation.isPending ||
    updateCategoryMutation.isPending ||
    deleteCategoryMutation.isPending;
  const articlePending =
    createArticleMutation.isPending ||
    updateArticleMutation.isPending ||
    updateStatusMutation.isPending;

  const onSubmitCategory = () => {
    if (!activeInstallationId) {
      toast.error("Select a widget installation first");
      return;
    }
    if (editingCategoryId) {
      updateCategoryMutation.mutate();
      return;
    }
    createCategoryMutation.mutate();
  };

  const onSubmitArticle = () => {
    if (!activeInstallationId) {
      toast.error("Select a widget installation first");
      return;
    }
    if (editingArticleId) {
      updateArticleMutation.mutate();
      return;
    }
    createArticleMutation.mutate();
  };

  const beginEditCategory = (category: WidgetArticleCategory) => {
    setEditingCategoryId(category.id);
    setDeleteCategoryId(null);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      sortOrder: String(category.sortOrder),
    });
  };

  const beginEditArticle = (article: WidgetArticle) => {
    setEditingArticleId(article.id);
    setArticleForm({
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      content: article.content,
      categoryId: article.categoryId ?? "",
      sortOrder: String(article.sortOrder),
    });
  };

  if (!canManage) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <h1 className="text-lg font-semibold text-oc-text">Knowledge Base</h1>
          <p className="mt-2 text-sm text-oc-muted">
            {user?.role ? `${roleLabel(user.role)} users do not have knowledge base management access.` : "Sign in to continue."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-oc-text">Knowledge Base</h1>
            <p className="mt-1 text-sm text-oc-muted">
              Manage internal widget article categories and article lifecycle for each widget installation.
            </p>
          </div>
          <div className="w-full max-w-sm">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-oc-muted">
              Widget installation
            </label>
            <select
              value={activeInstallationId}
              onChange={(event) => setSelectedInstallationId(event.target.value)}
              className="h-11 w-full rounded-xl border border-oc-border bg-oc-panel px-3 text-sm text-oc-text outline-none transition focus:border-oc-accent"
              disabled={installationsQuery.isLoading || !installationsQuery.data?.length}
            >
              {!installationsQuery.data?.length ? (
                <option value="">No installations available</option>
              ) : null}
              {installationsQuery.data?.map((installation) => (
                <option key={installation.id} value={installation.id}>
                  {installation.companyDisplayName?.trim() || installation.publicKey}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {installationsQuery.isLoading ? (
        <Card className="p-6 text-sm text-oc-muted">Loading widget installations...</Card>
      ) : null}

      {installationsQuery.isError ? (
        <Card className="p-6 text-sm text-red-400">
          {getErrorMessage(installationsQuery.error, "Could not load widget installations")}
        </Card>
      ) : null}

      {!activeInstallationId && !installationsQuery.isLoading ? (
        <Card className="p-6 text-sm text-oc-muted">
          Create a widget installation in Settings before managing the knowledge base.
        </Card>
      ) : null}

      {activeInstallationId ? (
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-oc-text">Categories</h2>
                <p className="mt-1 text-sm text-oc-muted">Create categories and keep slugs unique per widget.</p>
              </div>
              {editingCategoryId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingCategoryId(null);
                    setCategoryForm(emptyCategoryForm);
                  }}
                  disabled={categoryPending}
                >
                  Cancel edit
                </Button>
              ) : null}
            </div>

            <div className="mt-5 space-y-3">
              <Input
                placeholder="Billing"
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    name: event.target.value,
                    slug: editingCategoryId ? current.slug : slugify(event.target.value),
                  }))
                }
                disabled={categoryPending}
              />
              <Input
                placeholder="billing"
                value={categoryForm.slug}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, slug: event.target.value }))
                }
                disabled={categoryPending}
              />
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={categoryForm.sortOrder}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, sortOrder: event.target.value }))
                }
                disabled={categoryPending}
              />
              <Button
                type="button"
                onClick={onSubmitCategory}
                disabled={categoryPending || !categoryForm.name.trim() || !categoryForm.slug.trim()}
              >
                {editingCategoryId ? "Save category" : "Create category"}
              </Button>
            </div>

            <div className="mt-6 space-y-3">
              {categoriesQuery.isLoading ? (
                <p className="text-sm text-oc-muted">Loading categories...</p>
              ) : null}
              {categoriesQuery.isError ? (
                <p className="text-sm text-red-400">
                  {getErrorMessage(categoriesQuery.error, "Could not load categories")}
                </p>
              ) : null}
              {!categoriesQuery.isLoading && !categoriesQuery.data?.length ? (
                <p className="text-sm text-oc-muted">No categories yet.</p>
              ) : null}
              {categoriesQuery.data?.map((category) => {
                const isConfirming = deleteCategoryId === category.id;
                return (
                  <div key={category.id} className="rounded-2xl border border-oc-border bg-oc-panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-oc-text">{category.name}</p>
                        <p className="mt-1 text-xs text-oc-muted">/{category.slug} · sort {category.sortOrder}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => beginEditCategory(category)}
                          disabled={categoryPending}
                        >
                          Edit
                        </Button>
                        {canAdmin ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteCategoryId(isConfirming ? null : category.id)}
                            disabled={categoryPending}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {isConfirming ? (
                      <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                        <p>Delete this category? This will fail if any article is still assigned to it.</p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => deleteCategoryMutation.mutate(category.id)}
                            disabled={categoryPending}
                          >
                            Confirm delete
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteCategoryId(null)}
                            disabled={categoryPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-oc-text">Articles</h2>
                <p className="mt-1 text-sm text-oc-muted">
                  Use plain text content, publish when ready, and archive instead of deleting.
                </p>
              </div>
              <div className="w-full max-w-[180px]">
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-oc-muted">
                  Status filter
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "ALL" | WidgetArticleStatus)}
                  className="h-11 w-full rounded-xl border border-oc-border bg-oc-panel px-3 text-sm text-oc-text outline-none transition focus:border-oc-accent"
                >
                  <option value="ALL">All</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <Input
                placeholder="How do I reset my password?"
                value={articleForm.title}
                onChange={(event) =>
                  setArticleForm((current) => ({
                    ...current,
                    title: event.target.value,
                    slug: editingArticleId ? current.slug : current.slug || slugify(event.target.value),
                  }))
                }
                disabled={articlePending}
              />
              <Input
                placeholder="reset-password"
                value={articleForm.slug}
                onChange={(event) =>
                  setArticleForm((current) => ({ ...current, slug: event.target.value }))
                }
                disabled={articlePending}
              />
              <Textarea
                placeholder="Short summary shown in listings"
                value={articleForm.summary}
                onChange={(event) =>
                  setArticleForm((current) => ({ ...current, summary: event.target.value }))
                }
                disabled={articlePending}
                className="min-h-24 lg:col-span-2"
              />
              <Textarea
                placeholder="Plain text article content"
                value={articleForm.content}
                onChange={(event) =>
                  setArticleForm((current) => ({ ...current, content: event.target.value }))
                }
                disabled={articlePending}
                className="min-h-40 lg:col-span-2"
              />
              <select
                value={articleForm.categoryId}
                onChange={(event) =>
                  setArticleForm((current) => ({ ...current, categoryId: event.target.value }))
                }
                className="h-11 rounded-xl border border-oc-border bg-oc-panel px-3 text-sm text-oc-text outline-none transition focus:border-oc-accent"
                disabled={articlePending}
              >
                <option value="">No category</option>
                {categoriesQuery.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={articleForm.sortOrder}
                onChange={(event) =>
                  setArticleForm((current) => ({ ...current, sortOrder: event.target.value }))
                }
                disabled={articlePending}
              />
              <div className="flex flex-wrap gap-2 lg:col-span-2">
                <Button
                  type="button"
                  onClick={onSubmitArticle}
                  disabled={
                    articlePending ||
                    !articleForm.title.trim() ||
                    !articleForm.slug.trim() ||
                    !articleForm.summary.trim() ||
                    !articleForm.content.trim()
                  }
                >
                  {editingArticleId ? "Save article" : "Create article"}
                </Button>
                {editingArticleId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditingArticleId(null);
                      setArticleForm(emptyArticleForm);
                    }}
                    disabled={articlePending}
                  >
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {articlesQuery.isLoading ? (
                <p className="text-sm text-oc-muted">Loading articles...</p>
              ) : null}
              {articlesQuery.isError ? (
                <p className="text-sm text-red-400">
                  {getErrorMessage(articlesQuery.error, "Could not load articles")}
                </p>
              ) : null}
              {!articlesQuery.isLoading && !filteredArticles.length ? (
                <p className="text-sm text-oc-muted">
                  {statusFilter === "ALL" ? "No articles yet." : `No ${statusFilter.toLowerCase()} articles.`}
                </p>
              ) : null}
              {filteredArticles.map((article) => (
                <div key={article.id} className="rounded-2xl border border-oc-border bg-oc-panel p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-oc-text">{article.title}</p>
                        <Badge tone={statusTone(article.status)}>{article.status}</Badge>
                      </div>
                      <p className="text-xs text-oc-muted">/{article.slug}</p>
                      <p className="text-sm text-oc-muted">{article.summary}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-oc-muted">
                        <span>Category: {article.category?.name ?? "None"}</span>
                        <span>Sort: {article.sortOrder}</span>
                        <span>
                          Published: {article.publishedAt ? new Date(article.publishedAt).toLocaleString() : "Not yet"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => beginEditArticle(article)}
                        disabled={articlePending}
                      >
                        Edit
                      </Button>
                      {article.status !== "PUBLISHED" ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            updateStatusMutation.mutate({ articleId: article.id, status: "PUBLISHED" })
                          }
                          disabled={articlePending}
                        >
                          Publish
                        </Button>
                      ) : null}
                      {article.status === "PUBLISHED" && canAdmin ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateStatusMutation.mutate({ articleId: article.id, status: "ARCHIVED" })
                          }
                          disabled={articlePending}
                        >
                          Archive
                        </Button>
                      ) : null}
                      {article.status === "ARCHIVED" ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            updateStatusMutation.mutate({ articleId: article.id, status: "PUBLISHED" })
                          }
                          disabled={articlePending}
                        >
                          Republish
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
