import React from "react";
import PaymentForm from "sabpaisa-pg-dev";

const SabPaisaPaymentForm = ({ formData, onResponse }) => {
  return (
    <PaymentForm
      {...formData}
      callbackFunction={onResponse}
      env="prod" // Live payments ke liye 'prod' rakhein
    />
  );
};

export default SabPaisaPaymentForm;