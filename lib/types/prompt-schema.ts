export type StandardPrompt = {
  subject: {
    identity: {
      description?: string;
      name?: string;
      species?: string;       // from "species"
      age?: string;          // from "biometrics.age" or "age_range"
      ethnicity?: string;    // from "biometrics.ethnicity" or "ethnicity"
      gender?: string;       // from "biometrics.sex_dimorphism"
      [key: string]: unknown;
    };
    appearance: {
      body: {
        description?: string; // from "body"
        height?: string;      // from "biometrics.height"
        build?: string;       // from "biometrics.bmi_indication"
        details?: Record<string, unknown>; // Full "biometrics" object
        nails?: string;
        [key: string]: unknown;
      };
      skin: {
        description?: string; // from "skin"
        details?: {           // Full "dermatology" object
           fitzpatrick_type?: string;
           undertones?: string;
           texture_map?: Record<string, unknown>;
           surface_details?: string[];
           subsurface_scattering?: string;
           cranial_appendages?: unknown; // for "cranial_appendages"
           [key: string]: unknown;
        };
        [key: string]: unknown;
      };
      hair: {
        description?: string; // from "hair"
        physics?: Record<string, unknown>; // Full "hair_physics" object
        [key: string]: unknown;
      };
      face: {
        description?: string; // from "face"
        morphology?: Record<string, unknown>; // Full "morphology" object
        features?: {
          makeup?: string;
          eyebrows?: string;
          eye_shadow?: string;
          eye_liner?: string;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };
      eyes: {
        description?: string;
        color?: string;
        details?: Record<string, unknown>; // from "morphology.eyes"
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    wardrobe: {
      description?: string;
      top?: string;
      bottom?: string;
      footwear?: string;
      underwear?: string;
      accessories?: string[]; // Merged from "jewelry", "belt", etc.
      [key: string]: unknown;
    };
    pose: {
      description?: string;
      body?: string; // from "poses.body"
      hands?: string;
      expression?: string;
      gaze?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  scene: {
    description?: string;
    setting?: string;
    lighting?: string;
    atmosphere?: string;
    props?: string[];
    [key: string]: unknown;
  };
  camera: {
    description?: string;
    settings?: string;
    film_stock?: string;
    effects?: string;
    [key: string]: unknown;
  };
  negative_prompt?: string[];
  [key: string]: unknown;
};
