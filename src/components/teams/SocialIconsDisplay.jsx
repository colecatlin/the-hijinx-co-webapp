import React from 'react';
import { Instagram, Youtube, Facebook, Globe, Linkedin } from 'lucide-react';

const SocialIcon = ({ Icon, href, label }) => {
  const commonClasses = "p-2 rounded-full transition-colors";
  const activeClasses = "text-[#232323] hover:bg-gray-200";
  const inactiveClasses = "text-gray-400 cursor-not-allowed";

  return (
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={`${commonClasses} ${activeClasses}`}>
        <Icon className="w-5 h-5" />
      </a>
    ) : (
      <div aria-label={label} className={`${commonClasses} ${inactiveClasses}`}>
        <Icon className="w-5 h-5" />
      </div>
    )
  );
};

const CustomSocialIcon = ({ SvgPath, href, label }) => {
  const commonClasses = "p-2 rounded-full transition-colors";
  const activeClasses = "text-[#232323] hover:bg-gray-200";
  const inactiveClasses = "text-gray-400 cursor-not-allowed";

  return (
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={`${commonClasses} ${activeClasses}`}>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d={SvgPath} />
        </svg>
      </a>
    ) : (
      <div aria-label={label} className={`${commonClasses} ${inactiveClasses}`}>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d={SvgPath} />
        </svg>
      </div>
    )
  );
};

export default function SocialIconsDisplay({ media }) {
  return (
    <div className="flex gap-2">
      <SocialIcon Icon={Instagram} href={media?.social_instagram} label="Instagram" />
      <SocialIcon Icon={Facebook} href={media?.social_facebook} label="Facebook" />
      <CustomSocialIcon
        SvgPath="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
        href={media?.social_tiktok}
        label="TikTok"
      />
      <CustomSocialIcon
        SvgPath="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        href={media?.social_x}
        label="X"
      />
      <CustomSocialIcon
        SvgPath="M18.8 5.7H5.2C3.5 5.7 2.2 7 2.2 8.7v6.6c0 1.7 1.3 3 3 3h13.6c1.7 0 3-1.3 3-3V8.7c0-1.7-1.3-3-3-3zM8.3 15.3c-1.3 0-2.3-1.1-2.3-2.3s1-2.3 2.3-2.3 2.3 1 2.3 2.3-1 2.3-2.3 2.3zm7.4 0c-1.3 0-2.3-1.1-2.3-2.3s1-2.3 2.3-2.3 2.3 1 2.3 2.3-1.1 2.3-2.3 2.3z"
        href={media?.social_threads}
        label="Threads"
      />
      <SocialIcon Icon={Linkedin} href={media?.social_linkedin} label="LinkedIn" />
      <SocialIcon Icon={Youtube} href={media?.social_youtube} label="YouTube" />
      <SocialIcon Icon={Globe} href={media?.website_url} label="Website" />
    </div>
  );
}