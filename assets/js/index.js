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

      const faceMatcher = new faceapi.FaceMatcher(
        labeledDescriptors,
        0.6
      );

      setInterval(async () => {
        const detections = await faceapi
          .detectAllFaces(cam, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        const results = detections.map((d) =>
          faceMatcher.findBestMatch(d.descriptor)
        );

        const canvas = faceapi.createCanvasFromMedia(cam);
        document.body.appendChild(canvas);

        faceapi.matchDimensions(canvas, cam);

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
        "Prof Samuel",
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
            const img = await faceapi.fetchImage(
              `/assets/lib/face-api/labels/${label}/${i}.jpg`
            );

            const detections = await faceapi
              .detectSingleFace(img)
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (detections) {
              descriptions.push(detections.descriptor);
            }
            console.log(label + ": Carregada foto: " + i);
          } catch (error) {
            console.error(
              "Erro ao carregar a imagem de: " +
                label +
                " na posição: " +
                i,
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
        }
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
