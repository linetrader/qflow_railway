-- CreateIndex
CREATE INDEX "Post_tags_idx" ON "public"."Post" USING GIN ("tags" array_ops);
