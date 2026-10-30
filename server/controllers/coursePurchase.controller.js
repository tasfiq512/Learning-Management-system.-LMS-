import Stripe from "stripe";
import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export const createCheckoutSession = async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course id is required.",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: "Stripe is not configured.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/course-progress/${courseId}`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/course-detail/${courseId}`,
      metadata: {
        courseId: course._id.toString(),
        userId: req.id,
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: course.courseTitle,
            },
            unit_amount: Math.round((course.coursePrice || 0) * 100),
          },
          quantity: 1,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      session,
      url: session.url,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to create checkout session.",
    });
  }
};

export const stripeWebhook = async (req, res) => {
  try {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(200).json({ success: true, message: "Webhook skipped." });
    }

    const sig = req.headers["stripe-signature"];
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { courseId, userId } = session.metadata || {};

      if (courseId && userId) {
        const user = await User.findById(userId);
        const course = await Course.findById(courseId);

        if (user && course) {
          const alreadyEnrolled = user.enrolledCourses.some((id) => id.toString() === course._id.toString());
          if (!alreadyEnrolled) {
            user.enrolledCourses.push(course._id);
            course.enrolledStudents.push(user._id);
            await user.save();
            await course.save();
          }
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ success: false, message: "Invalid webhook payload." });
  }
};

export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate("creator", "name email");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const user = await User.findById(req.id);
    const isPurchased = !!user?.enrolledCourses?.some((id) => id.toString() === course._id.toString());

    return res.status(200).json({
      success: true,
      data: {
        course,
        isPurchased,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch purchase status.",
    });
  }
};

export const getAllPurchasedCourse = async (req, res) => {
  try {
    const user = await User.findById(req.id).populate("enrolledCourses");

    return res.status(200).json({
      success: true,
      courses: user?.enrolledCourses || [],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch purchased courses.",
    });
  }
};
