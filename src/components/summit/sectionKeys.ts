/** Every section of the Summit site (URL slug ↔ key mapping lives in lib/summitUrlSync). */
export type SummitSectionKey =
  | 'OVERVIEW'
  | 'PILLARS_MANIFESTO'
  | 'AGENDA'
  | 'SPEAKERS'
  | 'MAP_360'
  | 'BROADCAST_ROOMS'
  | 'SOCIAL_STREAM'
  | 'GUILD'
  | 'NETWORKING'
  | 'ENTREPRENEUR_MATCH'
  | 'EMBEDS_GAMES'
  | 'SPONSORS_HUB'
  | 'CREDENTIAL_GENERATOR'
  | 'PILLAR'
  | 'VISITS'
  // modules that used to be dialogs: each is its own page now
  | 'AVATAR_STUDIO'
  | 'REWARDS'
  | 'PASS_SCANNER'
  | 'TERMINAL'
  | 'MODELS_3D'
  | 'STUDIO_3D'
  | 'SPONSOR'
  | 'SPEAKER_PORTAL'
  // press room: accreditation form + press kit (/prensa)
  | 'PRESS'
  // welcome portal: /bienvenida and /bienvenida/<rol> (the role is the subtab)
  | 'WELCOME';
