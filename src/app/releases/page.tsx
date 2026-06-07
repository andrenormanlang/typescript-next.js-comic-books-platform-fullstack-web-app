import React, { Suspense } from "react";
import MetronReleasesClient from "@/components/MetronReleasesClient";
import { Spinner, Center } from "@chakra-ui/react";

const ReleasesPage = () => {
	return (
		<Suspense
		>
			<MetronReleasesClient />
		</Suspense>
	);
};

export default ReleasesPage;
