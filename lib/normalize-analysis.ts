type AnalysisData = Record<string, unknown>;

/**
 * Normalizes analysis data to consistent array format.
 * Handles both old single-object format and new array format.
 */
export const normalize_analysis = (data: AnalysisData): AnalysisData => {
  const result: AnalysisData = {};

  // Handle subjects (old: subject, new: subjects)
  if (data.subjects && Array.isArray(data.subjects)) {
    result.subjects = data.subjects;
  } else if (data.subject) {
    result.subjects = [data.subject];
  }

  // Handle wardrobe with nested arrays
  const wardrobe = data.wardrobe as AnalysisData | undefined;
  if (wardrobe) {
    const normalized_wardrobe: AnalysisData = {};

    // tops (old: top, new: tops)
    if (wardrobe.tops && Array.isArray(wardrobe.tops)) {
      normalized_wardrobe.tops = wardrobe.tops;
    } else if (wardrobe.top) {
      normalized_wardrobe.tops = [wardrobe.top];
    }

    // bottoms (old: bottom, new: bottoms)
    if (wardrobe.bottoms && Array.isArray(wardrobe.bottoms)) {
      normalized_wardrobe.bottoms = wardrobe.bottoms;
    } else if (wardrobe.bottom) {
      normalized_wardrobe.bottoms = [wardrobe.bottom];
    }

    // footwear (old: footwear string, new: footwear array)
    if (wardrobe.footwear && Array.isArray(wardrobe.footwear)) {
      normalized_wardrobe.footwear = wardrobe.footwear;
    } else if (wardrobe.footwear) {
      normalized_wardrobe.footwear = [wardrobe.footwear];
    }

    // accessories (pass through if exists)
    if (wardrobe.accessories) {
      normalized_wardrobe.accessories = wardrobe.accessories;
    }

    if (Object.keys(normalized_wardrobe).length > 0) {
      result.wardrobe = normalized_wardrobe;
    }
  }

  // Handle jewelry (old: object with description, new: array)
  if (data.jewelry && Array.isArray(data.jewelry)) {
    result.jewelry = data.jewelry;
  } else if (data.jewelry && typeof data.jewelry === "object") {
    const jewelry_obj = data.jewelry as AnalysisData;
    if (jewelry_obj.description) {
      result.jewelry = [jewelry_obj.description];
    }
  }

  // Handle poses (old: pose, new: poses)
  if (data.poses && Array.isArray(data.poses)) {
    result.poses = data.poses;
  } else if (data.pose) {
    result.poses = [data.pose];
  }

  // Handle scenes (old: scene string, new: scenes array)
  if (data.scenes && Array.isArray(data.scenes)) {
    result.scenes = data.scenes;
  } else if (data.scene) {
    result.scenes = [data.scene];
  }

  // Handle backgrounds (old: background object, new: backgrounds array)
  if (data.backgrounds && Array.isArray(data.backgrounds)) {
    result.backgrounds = data.backgrounds;
  } else if (data.background) {
    result.backgrounds = [data.background];
  }

  // Handle cameras (old: camera, new: cameras)
  if (data.cameras && Array.isArray(data.cameras)) {
    result.cameras = data.cameras;
  } else if (data.camera) {
    result.cameras = [data.camera];
  }

  return result;
};
