import Image from "next/image";

const PlaneGallery = ({ images }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {images.map((image, index) => (
        <div key={index} className="relative w-full h-64 rounded overflow-hidden shadow-lg">
          <Image
            src={image.src}
            alt={image.alt || `Plane photo ${index + 1}`}
            layout="fill"
            objectFit="cover"
            className="hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, 
                   (max-width: 1024px) 50vw, 
                   33vw"
          />
        </div>
      ))}
    </div>
  );
};

export default PlaneGallery;
