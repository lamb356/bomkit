CREATE TABLE "bom_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"version" integer NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_format" varchar(32) NOT NULL,
	"source_filename" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "bom_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"revision_id" integer NOT NULL,
	"designators" jsonb NOT NULL,
	"quantity" integer NOT NULL,
	"value" text NOT NULL,
	"footprint" text NOT NULL,
	"mpn" text,
	"manufacturer" text,
	"lcsc_part" text,
	"status" varchar(32) NOT NULL,
	"jlc_tier" varchar(32) NOT NULL,
	"jlc_loading_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"user_notes" text,
	"last_refreshed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jlc_parts_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"lcsc_part" text NOT NULL,
	"classification" varchar(32) NOT NULL,
	"preferred" boolean DEFAULT false NOT NULL,
	"description" text,
	"source" text DEFAULT 'lrks/jlcpcb-economic-parts' NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"row_id" integer NOT NULL,
	"source" text NOT NULL,
	"unit_price" numeric(12, 4) NOT NULL,
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"moq" integer,
	"lead_time_days" integer,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "locked_choices" (
	"id" serial PRIMARY KEY NOT NULL,
	"row_id" integer NOT NULL,
	"source" text NOT NULL,
	"sku" text,
	"unit_price" numeric(12, 4),
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bom_revisions" ADD CONSTRAINT "bom_revisions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_rows" ADD CONSTRAINT "bom_rows_revision_id_bom_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."bom_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_offers" ADD CONSTRAINT "local_offers_row_id_bom_rows_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."bom_rows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locked_choices" ADD CONSTRAINT "locked_choices_row_id_bom_rows_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."bom_rows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bom_revisions_project_id_idx" ON "bom_revisions" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bom_revisions_project_version_uidx" ON "bom_revisions" USING btree ("project_id","version");--> statement-breakpoint
CREATE INDEX "bom_rows_revision_id_idx" ON "bom_rows" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "bom_rows_lcsc_part_idx" ON "bom_rows" USING btree ("lcsc_part");--> statement-breakpoint
CREATE UNIQUE INDEX "jlc_parts_cache_lcsc_uidx" ON "jlc_parts_cache" USING btree ("lcsc_part");--> statement-breakpoint
CREATE INDEX "local_offers_row_id_idx" ON "local_offers" USING btree ("row_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locked_choices_row_id_uidx" ON "locked_choices" USING btree ("row_id");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");