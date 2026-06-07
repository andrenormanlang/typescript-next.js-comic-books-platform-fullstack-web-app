import React, { Suspense } from "react";
import MarvelEventsClient from "@/components/MarvelEventsClients";
import { Spinner, Center } from "@chakra-ui/react";

const MarvelEvents = () => {
  return (
    <Suspense
    >
      <MarvelEventsClient />
    </Suspense>
  );
};

export default MarvelEvents;
