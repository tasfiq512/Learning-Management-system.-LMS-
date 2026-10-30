import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import { uploadMedia } from "../utils/cloudinary.js";

const buildCourseFilters = (searchText, categories) => {
  const filters = [];

  if (searchText) {
    const text = searchText.trim();
    if (text) {
      filters.push({
        $or: [
          { courseTitle: { $regex: text, $options: "i" } },
          { description: { $regex: text, $options: "i" } },
          { category: { $regex: text, $options: "i" } },
        ],
      });
    }
  }

  if (categories) {
    const selectedCategories = Array.isArray(categories)
      ? categories
      : String(categories)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

    if (selectedCategories.length > 0) {
      filters.push({ category: { $in: selectedCategories } });
    }
  }

  return filters.length ? { $and: filters } : {};
};

export const createCourse = async (req, res) => {
  try {
    const { courseTitle, category } = req.body;

    if (!courseTitle || !category) {
      return res.status(400).json({
        success: false,
        message: "Course title and category are required.",
      });
    }

    const course = await Course.create({
      courseTitle,
      category,
      creator: req.id,
    });

    return res.status(201).json({
      success: true,
      message: "Course created successfully.",
      data: course,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating the course.",
    });
  }
};

export const getCreatorCourses = async (req, res) => {
  try {
    const courses = await Course.find({ creator: req.id }).populate("creator", "name email").sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch creator courses.",
    });
  }
};

export const searchCourse = async (req, res) => {
  try {
    const { query = "", categories = "", sortByPrice } = req.query;
    const filter = buildCourseFilters(query, categories);
    const sortOption = sortByPrice === "asc" ? { coursePrice: 1 } : sortByPrice === "desc" ? { coursePrice: -1 } : { createdAt: -1 };

    const courses = await Course.find({ isPublished: true, ...filter }).populate("creator", "name photoUrl").sort(sortOption);

    return res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to search courses.",
    });
  }
};

export const getPublishedCourse = async (_, res) => {
  try {
    const courses = await Course.find({ isPublished: true }).populate("creator", "name photoUrl").sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch published courses.",
    });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate("creator", "name email photoUrl").populate("lectures");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    return res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch course details.",
    });
  }
};

export const createLecture = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lectureTitle } = req.body;

    if (!lectureTitle) {
      return res.status(400).json({
        success: false,
        message: "Lecture title is required.",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const lecture = await Lecture.create({
      lectureTitle,
      isPreviewFree: false,
    });

    course.lectures.push(lecture._id);
    await course.save();

    return res.status(201).json({
      success: true,
      message: "Lecture created successfully.",
      lecture,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to create lecture.",
    });
  }
};

export const getCourseLecture = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate("lectures");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    return res.status(200).json({
      success: true,
      lectures: course.lectures,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch course lectures.",
    });
  }
};

export const editLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { lectureTitle, videoInfo, isPreviewFree } = req.body;

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found.",
      });
    }

    if (lectureTitle) lecture.lectureTitle = lectureTitle;
    if (videoInfo) {
      lecture.videoUrl = videoInfo.videoUrl || lecture.videoUrl;
      lecture.publicId = videoInfo.publicId || lecture.publicId;
    }
    if (typeof isPreviewFree === "boolean") {
      lecture.isPreviewFree = isPreviewFree;
    }

    await lecture.save();

    return res.status(200).json({
      success: true,
      message: "Lecture updated successfully.",
      lecture,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to update lecture.",
    });
  }
};

export const removeLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const lecture = await Lecture.findById(lectureId);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found.",
      });
    }

    const course = await Course.findOne({ lectures: lectureId });
    if (course) {
      course.lectures = course.lectures.filter((id) => id.toString() !== lectureId);
      await course.save();
    }

    await lecture.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Lecture removed successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to remove lecture.",
    });
  }
};

export const getLectureById = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const lecture = await Lecture.findById(lectureId);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found.",
      });
    }

    return res.status(200).json({
      success: true,
      lecture,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch lecture details.",
    });
  }
};

export const editCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { courseTitle, subTitle, description, category, courseLevel, coursePrice } = req.body;
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    if (courseTitle) course.courseTitle = courseTitle;
    if (subTitle) course.subTitle = subTitle;
    if (description) course.description = description;
    if (category) course.category = category;
    if (courseLevel) course.courseLevel = courseLevel;
    if (coursePrice !== undefined) course.coursePrice = Number(coursePrice);

    if (req.file && req.file.path) {
      const uploadedFile = await uploadMedia(req.file.path);
      course.courseThumbnail = uploadedFile?.secure_url || course.courseThumbnail;
    }

    await course.save();

    return res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      course,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to update course.",
    });
  }
};

export const togglePublishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { publish } = req.query;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    course.isPublished = publish === "true";
    await course.save();

    return res.status(200).json({
      success: true,
      message: `Course ${course.isPublished ? "published" : "unpublished"}.`,
      course,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to update publish status.",
    });
  }
};
