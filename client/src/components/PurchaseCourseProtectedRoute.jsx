import { useSelector } from "react-redux";
import { Navigate, useParams } from "react-router-dom";
import { useGetCourseDetailWithStatusQuery } from "@/features/api/purchaseApi";

const PurchaseCourseProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((store) => store.auth);
  const { courseId } = useParams();

  const { data, isLoading, isError } = useGetCourseDetailWithStatusQuery(courseId, {
    skip: !isAuthenticated || !courseId,
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <div className="p-6 text-center text-sm">Loading course access...</div>;
  }

  if (isError || !data?.data?.isPurchased) {
    return <Navigate to={`/course-detail/${courseId}`} replace />;
  }

  return children;
};

export default PurchaseCourseProtectedRoute;
