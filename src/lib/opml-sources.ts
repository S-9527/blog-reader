// 开放订阅目录根源（社区维护，无需人工添加）。cron 定期摄入刷新。
export type OpmlSource = {
  key: string; // 来源标识，写入 PresetFeed.source
  label: string;
  url: string; // OPML 直接下载地址（raw）
  defaultCategory: string; // 该目录的统一粗分类（OPML 本身几乎不带分组标签）
};

export const OPML_SOURCES: OpmlSource[] = [
  {
    key: "dev-blog-directory",
    label: "Developer Blog Directory",
    // 社区维护：https://github.com/dev-blog-directory/dev-blog-directory （纯平铺 2000+ 条）
    url: "https://raw.githubusercontent.com/dev-blog-directory/dev-blog-directory/master/readme.opml",
    defaultCategory: "Developer Blogs",
  },
  {
    key: "engineering-blogs",
    label: "Engineering Blogs (kilimchoi)",
    // 社区维护：https://github.com/kilimchoi/engineering-blogs （经典工程博客清单）
    url: "https://raw.githubusercontent.com/kilimchoi/engineering-blogs/master/engineering_blogs.opml",
    defaultCategory: "Engineering Blogs",
  },
];
