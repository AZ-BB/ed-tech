import { HERO_PROFILES } from "@/components/landing/data/landing-page-data";

type LandingHeroClusterProps = {
  caption: string;
};

export function LandingHeroCluster({ caption }: LandingHeroClusterProps) {
  return (
    <div className="hero-cluster">
      <div className="pc-glow g1" />
      <div className="pc-glow g2" />
      <div className="pc-glow g3" />
      {HERO_PROFILES.map((profile, i) => (
        <div
          key={i}
          className={`pc${profile.mobile === false ? " pc--hide-mobile" : ""}`}
          style={{
            width: profile.size,
            height: profile.size,
            ...profile.pos,
          }}
        >
          {profile.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.img} alt="" />
          ) : null}
        </div>
      ))}
      <div className="hero-cap">{caption}</div>
    </div>
  );
}
