const DevErrorBoundaryProbePage = () => {
  throw new Error("Intentional dev probe crash for admin error boundary verification");
};

export { DevErrorBoundaryProbePage };
