window.onload = async () => {
  // Obtém o elemento de vídeo da câmera
  const cam = document.getElementById("cam");

  // Função para iniciar o vídeo da câmera frontal...dispositivo notebook ou celular
  const startVideo = async () => {
    try {
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      let constraints = {};

      if (isMobileDevice) {
        constraints = {
          video: {
            facingMode: { exact: "environment" },
          },
        };
      } else {
        constraints = {
          video: { facingMode: "user" },
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      cam.srcObject = stream;

      return new Promise((resolve) => {
        cam.onloadedmetadata = () => {
          resolve();
        };
      });
    } catch (error) {
      console.error("Erro ao iniciar o vídeo da câmera:", error);
    }
  };

  // Função para carregar os modelos
  const loadModels = async () => {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(
        "/assets/lib/face-api/models"
      );
      await faceapi.nets.faceLandmark68Net.loadFromUri(
        "/assets/lib/face-api/models"
      );
      await faceapi.nets.faceRecognitionNet.loadFromUri(
        "/assets/lib/face-api/models"
      );
      await faceapi.nets.faceExpressionNet.loadFromUri(
        "/assets/lib/face-api/models"
      );
      await faceapi.nets.ssdMobilenetv1.loadFromUri(
        "/assets/lib/face-api/models"
      );
    } catch (error) {
      console.error("Erro ao carregar os modelos:", error);
    }
  };

  // Função para detectar rostos e realizar o reconhecimento facial
  const detectFaces = async () => {
    try {
      const labeledDescriptors = await loadLabels();

      if (labeledDescriptors.length === 0) {
        console.error("Nenhum rótulo de imagem foi carregado.");
        return;
      }

      const faceMatcher = new faceapi.FaceMatcher(
        labeledDescriptors,
        0.6
      );

      const canvas = document.createElement("canvas");
      document.body.appendChild(canvas);
      faceapi.matchDimensions(canvas, cam);

      setInterval(async () => {
        const detections = await faceapi
          .detectAllFaces(cam, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        const results = detections.map((d) =>
          faceMatcher.findBestMatch(d.descriptor)
        );

        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        faceapi.draw.drawDetections(canvas, detections);
        results.forEach((result, index) => {
          const { label, distance } = result;
          const box = detections[index].detection.box;

          const drawOptions = {
            label: `${label}`,
          };

          const drawBox = new faceapi.draw.DrawBox(box, drawOptions);
          drawBox.draw(canvas);
        });
      }, 250);
    } catch (error) {
      console.error("Erro durante a detecção de rostos:", error);
    }
  };

// Função para carregar os rótulos das imagens de cada pessoa cadastrada
const loadLabels = async () => {
  try {
    const labels = [
      "Antony",
      "Eduardo",
      "Fabio",
      "Fernando",
      "Filipe",
      "Leonardo",
      "Lucas",
      "ProfSamuel",
      "Raphael",
      "Rogerio",
      "Salvan",
      "Samuel",
    ]; // Array de pessoas
    const labeledDescriptors = [];

    for (const label of labels) {
      const descriptions = [];

      for (let i = 1; i <= 3; i++) {
        try {
          const response = await fetch(
            `./assets/lib/face-api/labels/${encodeURIComponent(label)}/${i}.jpg`
          );

          if (!response.ok) {
            console.warn(
              `Não foi possível carregar a imagem ${i} de ${label}. Ignorando esta imagem.`
            );
            continue;
          }

          const blob = await response.blob();
          const img = await faceapi.bufferToImage(blob);

          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (!detections) {
            console.warn(
              `Não foi possível detectar um rosto visível na imagem ${i} de ${label}. Ignorando esta imagem.`
            );
            continue;
          }

          descriptions.push(detections.descriptor);
          console.log(label + ": Carregada foto: " + i);
        } catch (error) {
          console.error(
            "Erro ao carregar a imagem de: " + label + " na posição: " + i,
            error
          );
        }
      }

      if (descriptions.length > 0) {
        const labeledDescriptor = new faceapi.LabeledFaceDescriptors(
          label,
          descriptions
        );
        labeledDescriptors.push(labeledDescriptor);
      } else {
        console.error(`Nenhum rosto detectado nas imagens de ${label}.`);
      }
    }

    if (labeledDescriptors.length === 0) {
      throw new Error("Nenhum rótulo de imagem foi carregado.");
    }

    return labeledDescriptors;
  } catch (error) {
    console.error("Erro ao carregar os rótulos das imagens:", error);
    return [];
  }
};



  // Carrega os modelos necessários, inicia o vídeo e detecta rostos
  await loadModels();
  await startVideo();
  await detectFaces();
};
