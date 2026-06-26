import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HERO_IMAGE } from "@/lib/assets";
import { cn } from "@/lib/cn";
import { BUSINESS_NAME } from "@/lib/utils";

type PageHeroProps = {
  businessName?: string;
  showBack?: boolean;
  backHref?: string;
  fullScreen?: boolean;
  bottomContent?: React.ReactNode;
  topContent?: React.ReactNode;
  className?: string;
  imagePriority?: boolean;
};

export function PageHero({
  businessName = BUSINESS_NAME,
  showBack = false,
  backHref = "/",
  fullScreen = true,
  bottomContent,
  topContent,
  className,
  imagePriority = true,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "page-hero",
        fullScreen && "page-hero--full",
        className
      )}
    >
      <div className="page-hero__media">
        <Image
          src={HERO_IMAGE}
          alt={businessName}
          fill
          priority={imagePriority}
          loading={imagePriority ? undefined : "lazy"}
          quality={95}
          className="object-cover grayscale"
          sizes="100vw"
        />
        <div className="page-hero__overlay" aria-hidden />
      </div>

      <div className="page-hero__content site-container">
        <div className="page-hero__top flex items-center justify-between pt-3">
          {showBack ? (
            <Link href={backHref} className="hero-back-btn" aria-label="חזרה">
              <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <div className="brand-lockup">
              <span className="brand-lockup-name">{businessName}</span>
            </div>
          )}
          {topContent}
        </div>

        {bottomContent && (
          <div className="page-hero__bottom">{bottomContent}</div>
        )}
      </div>
    </section>
  );
}
