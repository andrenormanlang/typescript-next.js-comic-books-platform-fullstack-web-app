import React, { Suspense } from "react";
import { Spinner, Center } from "@chakra-ui/react";
import MetronIssuesClient from "@/components/MetronIssuesClient";

const MetronIssues = () => {
	return (
		<Suspense
		>
			<MetronIssuesClient />
		</Suspense>
	);
};

export default MetronIssues;
