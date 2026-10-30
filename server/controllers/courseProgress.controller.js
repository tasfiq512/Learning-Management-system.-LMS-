import { CourseProgress } from "../models/courseProgress.js";

export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;

    let progress = await CourseProgress.findOne({
      userId: req.id,
      courseId,
    });

    if (!progress) {
      progress = await CourseProgress.create({
        userId: req.id,
        courseId,
        completed: false,
        lectureProgress: [],
      });
    }

    return res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch course progress.",
    });
  }
};

export const updateLectureProgress = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;

    let progress = await CourseProgress.findOne({
      userId: req.id,
      courseId,
    });

    if (!progress) {
      progress = await CourseProgress.create({
        userId: req.id,
        courseId,
        completed: false,
        lectureProgress: [],
      });
    }

    const existingProgress = progress.lectureProgress.find(
      (item) => item.lectureId.toString() === lectureId
    );

    if (existingProgress) {
      existingProgress.viewed = true;
    } else {
      progress.lectureProgress.push({ lectureId, viewed: true });
    }

    await progress.save();

    return res.status(200).json({
      success: true,
      message: "Lecture progress updated.",
      data: progress,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to update lecture progress.",
    });
  }
};

export const markAsCompleted = async (req, res) => {
  try {
    const { courseId } = req.params;

    let progress = await CourseProgress.findOne({
      userId: req.id,
      courseId,
    });

    if (!progress) {
      progress = await CourseProgress.create({
        userId: req.id,
        courseId,
        completed: true,
        lectureProgress: [],
      });
    } else {
      progress.completed = true;
      await progress.save();
    }

    return res.status(200).json({
      success: true,
      message: "Course marked as completed.",
      data: progress,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to mark course as completed.",
    });
  }
};

export const markAsInCompleted = async (req, res) => {
  try {
    const { courseId } = req.params;

    const progress = await CourseProgress.findOne({
      userId: req.id,
      courseId,
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Course progress not found.",
      });
    }

    progress.completed = false;
    await progress.save();

    return res.status(200).json({
      success: true,
      message: "Course marked as incomplete.",
      data: progress,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to mark course as incomplete.",
    });
  }
};
