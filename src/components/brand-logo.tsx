import Image from 'next/image'

export function BrandLogo({ alt = 'Prospect Energy' }: { alt?: string }) {
  return (
    <Image
      className="brand-image"
      src="/prospect-energy-logo.png"
      alt={alt}
      width={1254}
      height={1254}
      sizes="(max-width: 700px) 112px, 216px"
      preload
    />
  )
}
