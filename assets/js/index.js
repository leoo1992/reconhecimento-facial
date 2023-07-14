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
      // Cria um canvas para desenhar as detecções faciais
      const canvas = faceapi.createCanvasFromMedia(cam);
      const canvasSize = {
        width: cam.width,
        height: cam.height,
      };

      // Ajusta as dimensões do canvas
      faceapi.matchDimensions(canvas, canvasSize);

      // Adiciona o canvas ao corpo do documento HTML
      document.body.appendChild(canvas);

      // Carrega os rótulos das imagens de cada pessoa cadastrada
      const labels = await loadLabels();

      // Cria um identificador de rosto com base nos rótulos carregados e em uma tolerância de correspondência
      const faceMatcher = new faceapi.FaceMatcher(labels, 0.6);

      // Executa repetidamente a detecção de rostos e desenho no canvas
      setInterval(async () => {
        // Detecta todos os rostos no vídeo usando um modelo de detecção facial leve
        const detections = await faceapi
          .detectAllFaces(cam, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks() // analisa marcas de expressão
          .withFaceExpressions() // analisa expressões faciais
          .withFaceDescriptors(); // analisa descrições da face

        // Redimensiona as detecções para corresponder ao tamanho do canvas
        const resizedDetections = faceapi.resizeResults(
          detections,
          canvasSize
        );

        // Encontra a melhor correspondência de cada detecção de rosto com base nos descritores
        const results = resizedDetections.map((d) =>
          faceMatcher.findBestMatch(d.descriptor)
        );

        // Limpa o canvas
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        // Desenha as detecções faciais no canvas
        faceapi.draw.drawDetections(canvas, resizedDetections);

        // Desenha o nome da pessoa
        results.forEach((result, index) => {
          const box = resizedDetections[index].detection.box;
          const { label } = result;
          new faceapi.draw.DrawTextField([`${label}`], box.topLeft).draw(
            canvas
          );
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
        }
      }

      return labeledDescriptors;
    } catch (error) {
      console.error("Erro ao carregar os rótulos das imagens:", error);
      return [];
    }
  };

  // Carrega os modelos necessários e inicia o vídeo
  await loadModels();
  await startVideo();
  await detectFaces();
};
