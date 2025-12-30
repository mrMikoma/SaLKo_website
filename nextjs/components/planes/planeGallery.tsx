"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useNavbar } from "@/providers/NavbarContextProvider";

interface PlaneGalleryProps {
  images: Array<{
    src: string;
    alt: string;
  }>;
  planeName: string;
}

const PlaneGallery = ({ images, planeName }: PlaneGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { closeMobileMenu, setIsFullscreenMode } = useNavbar();

  // Disable scrolling when fullscreen is active and close mobile menu
  useEffect(() => {
    if (isFullscreen) {
      // Close mobile menu immediately when entering fullscreen
      closeMobileMenu();
      // Hide navbar when entering fullscreen
      setIsFullscreenMode(true);

      // Save original overflow values
      const originalOverflow = window.getComputedStyle(document.body).overflow;
      const originalHtmlOverflow = window.getComputedStyle(
        document.documentElement
      ).overflow;

      // Disable scrolling on both body and html
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      // Cleanup function to restore scrolling and navbar
      return () => {
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        setIsFullscreenMode(false);
      };
    }
  }, [isFullscreen, closeMobileMenu, setIsFullscreenMode]);

  // Keyboard navigation
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      } else if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, currentIndex]);

  if (!images || images.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <>
      <div className="relative mb-8 w-full aspect-video rounded-xl overflow-hidden border-2 border-sbluel/30 shadow-2xl group">
        {/* Main Image */}
        <div
          className="relative w-full h-full cursor-pointer"
          onClick={() => setIsFullscreen(true)}
        >
          <Image
            src={images[currentIndex].src}
            alt={images[currentIndex].alt || planeName}
            fill
            className="object-cover transition-opacity duration-500"
            priority={currentIndex === 0}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sblack/60 via-transparent to-transparent"></div>
          {/* Fullscreen Icon Hint */}
          <div className="absolute top-4 left-4 px-3 py-2 bg-sblack/50 backdrop-blur-sm border border-swhite/20 rounded-lg text-swhite text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </div>
        </div>

        {/* Navigation Arrows - Only show if more than 1 image */}
        {images.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              onClick={goToPrevious}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center bg-sblack/70 backdrop-blur-md border-2 border-swhite/30 rounded-full text-swhite hover:bg-sred hover:border-sred hover:scale-110 transition-all duration-300 shadow-xl z-10"
              aria-label="Previous image"
            >
              <svg
                className="w-4 h-4 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Next Button */}
            <button
              onClick={goToNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center bg-sblack/70 backdrop-blur-md border-2 border-swhite/30 rounded-full text-swhite hover:bg-sred hover:border-sred hover:scale-110 transition-all duration-300 shadow-xl z-10"
              aria-label="Next image"
            >
              <svg
                className="w-4 h-4 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Image Counter */}
            <div className="absolute top-2 sm:top-4 right-2 sm:right-4 px-2 py-1 sm:px-4 sm:py-2 bg-sblack/50 backdrop-blur-sm border border-swhite/20 rounded-lg text-swhite text-xs sm:text-sm font-semibold">
              {currentIndex + 1} / {images.length}
            </div>

            {/* Dot Indicators */}
            <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "bg-sred w-6 sm:w-8"
                      : "bg-swhite/50 hover:bg-swhite/80"
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Image Caption - Hidden on mobile, shown on desktop on hover */}
        {images[currentIndex].alt && (
          <div className="hidden sm:block absolute bottom-16 left-4 right-4 px-4 py-2 bg-sblack/50 backdrop-blur-sm border border-swhite/20 rounded-lg text-swhite text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {images[currentIndex].alt}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="!fixed !inset-0 !z-[99999] bg-sblack/98 backdrop-blur-sm flex items-center justify-center overflow-hidden touch-none"
          style={{ zIndex: 99999 }}
          onClick={(e) => {
            e.stopPropagation();
            setIsFullscreen(false);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Close Button */}
          <button
            className="absolute top-2 right-2 sm:top-4 sm:right-4 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-sblack/70 backdrop-blur-md border-2 border-swhite/30 rounded-full text-swhite hover:bg-sred hover:border-sred active:bg-sred active:border-sred hover:scale-110 transition-all duration-300 shadow-xl z-20"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(false);
            }}
            aria-label="Close fullscreen"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Fullscreen Image */}
          <div
            className="relative w-full h-full flex items-center justify-center px-2 sm:px-4"
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full max-h-[100dvh]">
              <Image
                src={images[currentIndex].src}
                alt={images[currentIndex].alt || planeName}
                fill
                className="object-contain"
                quality={100}
                sizes="100vw"
                priority
              />
            </div>

            {/* Navigation in Fullscreen - Only show if more than 1 image */}
            {images.length > 1 && (
              <>
                {/* Previous Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center bg-sblack/70 backdrop-blur-md border-2 border-swhite/30 rounded-full text-swhite hover:bg-sred hover:border-sred active:bg-sred active:border-sred hover:scale-110 active:scale-95 transition-all duration-300 shadow-xl z-20"
                  aria-label="Previous image"
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                {/* Next Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center bg-sblack/70 backdrop-blur-md border-2 border-swhite/30 rounded-full text-swhite hover:bg-sred hover:border-sred active:bg-sred active:border-sred hover:scale-110 active:scale-95 transition-all duration-300 shadow-xl z-20"
                  aria-label="Next image"
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>

                {/* Image Counter */}
                <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 sm:px-4 sm:py-2 bg-sblack/70 backdrop-blur-md border border-swhite/30 rounded-lg text-swhite text-xs sm:text-sm font-semibold">
                  {currentIndex + 1} / {images.length}
                </div>

                {/* Dot Indicators */}
                <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToSlide(index);
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                      }}
                      className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                        index === currentIndex
                          ? "bg-sred w-6 sm:w-8"
                          : "bg-swhite/50 hover:bg-swhite/80 active:bg-swhite"
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Image Caption in Fullscreen - Shown at bottom with small text */}
            {images[currentIndex].alt && (
              <div className="absolute bottom-12 sm:bottom-14 left-1/2 -translate-x-1/2 max-w-[90%] sm:max-w-[80%] px-3 py-1.5 sm:px-4 sm:py-2 bg-sblack/60 backdrop-blur-md border border-swhite/20 rounded-lg text-swhite text-xs sm:text-sm text-center">
                {images[currentIndex].alt}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PlaneGallery;
