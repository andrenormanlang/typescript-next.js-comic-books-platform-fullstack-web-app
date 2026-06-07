"use client";

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Image, Box, Button, Spinner } from "@chakra-ui/react";
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface ImageUploadProps {
  onUpload: (url: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onUpload }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadImage: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${uuidv4()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage.from('comics-images').upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from('comics-images').getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      setImageUrl(publicUrl);
      onUpload(publicUrl);
    } catch (error) {
      alert('Error uploading image!');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box textAlign="center" mb={4}>
      {imageUrl ? (
        <Image
          width="100%"
          src={imageUrl}
          alt="Uploaded Image"
          style={{ borderRadius: '10px' }}
        />
      ) : (
        <Box
          height="150px"
          width="100%"
          borderRadius="10px"
          bg="gray.200"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {uploading ? <Spinner /> : 'No image uploaded'}
        </Box>
      )}
      <Box mt={4}>
        <Button asChild
          colorPalette="teal"
        ><label htmlFor="imageUpload">
          Upload Image
        </label></Button>
        <input
          style={{
            visibility: 'hidden',
            position: 'absolute',
          }}
          type="file"
          id="imageUpload"
          accept="image/*"
          onChange={uploadImage}
          disabled={uploading}
        />
      </Box>
    </Box>
  );
};

export default ImageUpload;

