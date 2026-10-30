import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCreateCheckoutSessionMutation } from "@/features/api/purchaseApi";

const BuyCourseButton = ({ courseId }) => {
  const [createCheckoutSession, { isLoading }] = useCreateCheckoutSessionMutation();
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    try {
      setError("");
      const response = await createCheckoutSession(courseId).unwrap();

      if (response?.url) {
        window.location.href = response.url;
        return;
      }

      if (response?.session?.url) {
        window.location.href = response.session.url;
        return;
      }

      setError("Unable to start checkout.");
    } catch (err) {
      setError(err?.data?.message || "Checkout failed. Please try again.");
    }
  };

  return (
    <div className="w-full space-y-2">
      <Button onClick={handleCheckout} disabled={isLoading} className="w-full">
        {isLoading ? "Processing..." : "Buy Course"}
      </Button>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
};

export default BuyCourseButton;
