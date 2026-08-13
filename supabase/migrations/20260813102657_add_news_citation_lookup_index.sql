create index if not exists news_citations_publication_article_idx
  on public.news_citations (publication_id, article_id);
