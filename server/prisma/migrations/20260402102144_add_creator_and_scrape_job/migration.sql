-- CreateTable
CREATE TABLE "creators" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "bio" TEXT,
    "score" TEXT,
    "categories" TEXT[],
    "followers" TEXT,
    "followers_count" INTEGER,
    "gmv" TEXT,
    "items_sold" INTEGER,
    "avg_views" TEXT,
    "engagement_rate" TEXT,
    "gpm" TEXT,
    "gmv_per_customer" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "tiktok_url" TEXT,
    "shop_id" TEXT,
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_jobs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total" INTEGER NOT NULL DEFAULT 0,
    "scraped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "shop_id" TEXT,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrape_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creators_creator_id_key" ON "creators"("creator_id");

-- CreateIndex
CREATE INDEX "creators_username_idx" ON "creators"("username");

-- CreateIndex
CREATE INDEX "creators_shop_id_idx" ON "creators"("shop_id");

-- CreateIndex
CREATE INDEX "creators_scraped_at_idx" ON "creators"("scraped_at");

-- CreateIndex
CREATE INDEX "scrape_jobs_status_idx" ON "scrape_jobs"("status");
