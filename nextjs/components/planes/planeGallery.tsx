import ImageGallery from "@/components/imageGallery";

interface PlaneGalleryProps {
  images: Array<{
    src: string;
    alt: string;
  }>;
  planeName: string;
}

const PlaneGallery = ({ images, planeName }: PlaneGalleryProps) => {
  return <ImageGallery images={images} title={planeName} />;
};

export default PlaneGallery;
