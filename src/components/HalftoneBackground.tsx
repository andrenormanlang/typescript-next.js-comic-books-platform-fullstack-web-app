"use client";

import { Box, Container } from "@chakra-ui/react";
import { Global } from "@emotion/react";
import { ReactNode } from "react";

interface HalftoneBackgroundProps {
	children: ReactNode;
}

const HalftoneBackground = ({ children }: HalftoneBackgroundProps) => {
	return (
		<>
			<Global
				styles={`
          @layer base {
            .halftone-background {
              position: relative;
              overflow: hidden;
              width: 100%;
              height: 100%;
              background-color: white;
              transition: background-color 0.5s ease;
            }

            .halftone-background::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-size: 10px 10px;
              background-image: radial-gradient(circle, black 3px, transparent 3px);
              transition: background-image 0.5s ease;
            }

            .dark .halftone-background,
            [data-theme="dark"] .halftone-background {
              background-color: black;
            }

            .dark .halftone-background::before,
            [data-theme="dark"] .halftone-background::before {
              background-image: radial-gradient(circle, white 3px, transparent 3px);
            }
          }
        `}
			/>
			<Box className="halftone-background" position="relative" zIndex="0">
				<Container maxW="container.xl" p={4} position="relative" zIndex="1">
					{children}
				</Container>
			</Box>
		</>
	);
};

export default HalftoneBackground;
