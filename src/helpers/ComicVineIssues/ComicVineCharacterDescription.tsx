import React from "react";
import parse, { HTMLReactParserOptions } from "html-react-parser";
import {List,  Box, Heading, Text, useBreakpointValue } from "@chakra-ui/react";
import { LazyLoadImage, trackWindowScroll, ScrollPosition } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import domNodeToString, { DomNodeOrChild } from "./domNodeToString";

interface ComicVineCharacterDescriptionProps {
	content: string;
	scrollPosition: ScrollPosition;
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

const ComicVineCharacterDescription: React.FC<ComicVineCharacterDescriptionProps> = ({ content, scrollPosition }) => {
	const linkStyle = {
		fontWeight: "bold",
		fontSize: "sm",
		color: "teal",
		textDecoration: "underline",
		_before: {
			content: '"• "',
			color: "red",
		},
		ml: 2,
	};
	const b = {
		fontWeight: "bold",
		fontSize: "sm",
		color: "teal",
		ml: 2,
	};
	const maxWidth = useBreakpointValue({ base: "300px", md: "600px" });

	const ImageLinkWrapper: React.FC<ImageLinkWrapperProps> = ({ href, children }) => (
		<>{children}</>
	);

	const options : HTMLReactParserOptions  = {
		// @ts-ignore
		replace: (domNode: DomNode, index: number)  => {
			if (domNode.name === "a" && domNode.attribs.href && domNode.attribs["data-ref-id"]) {
				const newHref = `https://comicvine.gamespot.com/images/${domNode.attribs["data-ref-id"]}`;
				domNode.attribs.href = newHref;
			}
			if (domNode.name === "img" && domNode.attribs["data-src"]) {
				const {
					alt,
					"data-src": dataSrc,
					"data-placeholder": dataPlaceholder,
					"data-srcset": dataSrcset,
					"data-ref-id": dataRefId,
				} = domNode.attribs;
				const src = dataSrc || "";
				const placeholder = dataPlaceholder || "path_to_your_placeholder_image";
				const srcSet = dataSrcset || "";
				const imageUrl = dataRefId ? `https://comicvine.gamespot.com/images/${dataRefId}` : "#";
				return (
					<ImageLinkWrapper href={src}>
						{/* ignore error */}
						{/* @ts-ignore */}
						<LazyLoadImage
							alt={alt || ""}
							src={imageUrl}
							effect="blur"
							placeholderSrc={placeholder}
							scrollPosition={scrollPosition}
							style={{
								height: "auto",
								width: "100%",
								maxWidth: maxWidth,
							}}
							srcSet={srcSet}
							// borderRadius="md"
							// 	size={{ base: "100%", md: "600px" }}
							// 	objectFit="contain"
							// 	p={2}

							// 	alt={`Cover of ${comic.name}`}
							// 	mb={{ base: 4, md: 0 }}
							// 	alignSelf={{ base: "center", md: "auto" }}
							// 	justifySelf={{ base: "center", md: "auto" }}
							// 	mx={{ base: "auto", md: 0 }}
						/>
					</ImageLinkWrapper>
				);
			} else if (domNode.name === "h2") {
				return (
					<Heading
						as="h2"
						size={{ base: "md", md: "lg" }}
						mt="1rem"
						mb="1rem"
						color="red"
					>
						{domNode.children[0].data}
					</Heading>
				);
			} else if (domNode.name === "h3") {
				return (
					<Heading
						as="h3"
						size={{ base: "md", md: "lg" }}
						mt="1rem"
						mb="1rem"
						color="red"
					>
						{domNode.children[0].data}
					</Heading>
				);
			} else if (domNode.name === "h4") {
				return (
					<Heading
						as="h3"
						size={{ base: "md", md: "md" }}
						mt="1rem"
						mb="1rem"
						color="red"
					>
						{domNode.children[0].data}
					</Heading>
				);
			} else if (domNode.name === "figcaption") {
				return (
					<Text
						fontSize={{ base: "0.9rem", md: "md" }}
						fontWeight="bold"
						mt="0.2rem"
						mb="1rem"
						pl="0.5rem"
						color="teal.300"
						textAlign="initial"
						minW="300px"
					>
						{domNode.children[0].data}
					</Text>
				);
			} else if (domNode.name === "p") {
				return (
					<Text mb="0.7rem" mt="0.5rem" fontSize={{ base: "0.9rem", md: "md" }}>
						{domNode.children.map((child, index) => {
							if (child.type === "text" && typeof child.data === "string") {
								return <React.Fragment key={index}>{child.data}</React.Fragment>;
							} else if (child.type === "tag" && child.name === "a" && child.attribs && child.children) {
								// Ensure that child.children[0].data is a string and that child.attribs.href exists
								const linkText =
									child.children[0] && typeof child.children[0].data === "string" ? child.children[0].data : "";
								let href = child.attribs.href ? child.attribs.href : "#";
								if (href.startsWith("/")) {
									href = `https://comicvine.gamespot.com${href}`;
								}
								if (href.startsWith("../../")) {
									href = `https://comicvine.gamespot.com/${href}`;
								}
								return (
									<a
										href={href}
										style={{ fontWeight: "bold", color: "teal", textDecoration: "underline" }}
										key={index}
										target="_blank"
										rel="noopener noreferrer"
									>
										{linkText}
									</a>
								);
							}  else if (child.type === "tag" && child.name === "b" && child.attribs && child.children) {
								// Ensure that child.children[0].data is a string and that child.attribs.href exists
								const b = child.children[0] && typeof child.children[0].data === "string" ? child.children[0].data : "";
								return (
									<Text
										as="b"
										key={index}
										style={{
											fontWeight: "bold",
											fontSize: "1.2rem",
											color: "steelblue",
										}}
										mb="1rem"
									>
										{b}
									</Text>
								);
							}
						})}
					</Text>
				);
			}
			if (domNode.name === "ul") {
				return (
				  <List.Root style={{ fontWeight: 'bold', fontSize: '1.2rem' }} mb="1rem">
					{domNode.children.map((child, index) => {
					  // Check if 'child' is an object representing an 'li' element and handle it
					  if (child.type === "tag" && child.name === "li") {
						// Check if the 'li' element has children that need to be parsed
						return (
						  <List.Item key={index}>
							{child.children?.map((nestedChild, nestedIndex) => {
							  // If 'nestedChild' has a 'data' property, it is a text node
							  if (nestedChild.type === "text" && nestedChild.data) {
								return <React.Fragment key={nestedIndex}>{nestedChild.data}</React.Fragment>;
							  }
							  // If 'nestedChild' is another tag, parse its inner HTML
							  else if (nestedChild && nestedChild.type === "tag") {
								// Convert the inner HTML of 'nestedChild' back to a string to parse
								const innerHtml = domNodeToString(nestedChild as DomNodeOrChild); // Type assertion
								console.log('innerHtml:', innerHtml);
								return <React.Fragment key={nestedIndex}>{parse(innerHtml, options)}</React.Fragment>;
							  }
							  return null;
							})}
						  </List.Item>
						);
					  }
					  return null;
					})}
				  </List.Root>
				);
			  }


			// If no specific replacement is needed, return undefined to let html-react-parser handle the node as usual
			return undefined;
		},
	};
	const parsedContent = parse(content, options);

	return <Box>{parsedContent}</Box>;
};

// ignore type error
// @ts-ignore
export default trackWindowScroll(ComicVineCharacterDescription);
