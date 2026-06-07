import React from "react";
import parse, { DOMNode, HTMLReactParserOptions, domToReact  } from "html-react-parser";
import {List,  Box, Heading, Link, Text, useBreakpointValue } from "@chakra-ui/react";
import { LazyLoadImage, ScrollPosition } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";


interface ComicVinePublisherDescriptionProps {
	content: string;
	scrollPosition?: ScrollPosition;
}

interface ImageLinkWrapperProps {
	href: string;
	children: React.ReactNode;
}

interface DomNodeAttributes {
	[key: string]: string | undefined;
	href?: string;
}

interface DomNodeChild {
	type: string;
	data?: string;
	// Add these properties if a DomNodeChild can be an element with attributes and children
	name?: string;
	attribs?: {
		[key: string]: string | undefined;
		href?: string;
	};
	children?: DomNodeChild[];
}

export interface DomNode {
	name: string;
	attribs: {
		[key: string]: string | undefined;
		src?: string;
		alt?: string;
		"data-src"?: string;
		"data-placeholder"?: string;
		"data-srcset"?: string;
		"data-ref"?: string;
	};
	children: DomNodeChild[];
}

// Assume other imports and setup are correctly placed here

const ComicVinePublisherDescription: React.FC<ComicVinePublisherDescriptionProps> = ({ content, scrollPosition }) => {
  const maxWidth = useBreakpointValue({ base: "100%", md: "300px" });


	const ImageLinkWrapper: React.FC<ImageLinkWrapperProps> = ({ href, children }) => (
		<a href={href} target="_blank" rel="noopener noreferrer">
			{children}
		</a>
	);


  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
		if (domNode.type === 'tag' && 'name' in domNode && 'attribs' in domNode) {
			const { name, attribs, children } = domNode as DomNode; // Cast the type to DomNode
        switch (name) {
          case 'h2':
          case 'h3':
		  case 'h4':
            // Handling headings
            return (
              <Heading as={name} size="md" mt={4} mb={4} color={"red"}>
                    {domToReact(children as unknown as DOMNode[], options)}
              </Heading>
            );
			case 'img':
				const { alt, src, "data-src": dataSrc } = attribs;
			  return (
				// @ts-ignore
				<LazyLoadImage
                alt={alt}
                effect="blur"
                src={dataSrc || src}
                scrollPosition={scrollPosition}
                style={{ height: "auto", width: "100%", maxWidth: maxWidth,  marginBottom: 16}}
              />
			  );
          case 'p':
            // Handling paragraphs
            return (
				<Text mb={4}>
				  {domToReact(children as unknown as DOMNode[], options)}
				</Text>
			  );
          case 'a':
            // Handling links
			let href = attribs.href || ''; // Provide a default empty string
if (!href.startsWith('http') && !href.startsWith('//')) {
  href = `https://comicvine.gamespot.com${href}`;
}
            return (
              <Link href={href} target="_blank" rel="noopener noreferrer" color="blue.500" fontWeight="bold" style={{width:"300px"}}>
                {domToReact(children as unknown as DOMNode[], options)}
              </Link>
            );
		  case 'figcaption':
			return (
				<Text fontSize="sm" fontStyle="italic" textAlign="initial" minWidth={"300px"} mb={2}>
					{domToReact(children as DOMNode[], options)}
				</Text>
			);
          case 'ul':
            // Handling unordered lists
			return (
				<List.Root mb={4}>
				  {domToReact(children as DOMNode[], options)}
				</List.Root>
			  );
			  case 'li':
				return (
				  <List.Item>
					{domToReact(children as DOMNode[], options)}
				  </List.Item>
				);

          // Add more cases as needed
        }
      }
    },
  };

  const parsedContent = parse(content, options);

  return <Box>{parsedContent}</Box>;
};

export default ComicVinePublisherDescription;
