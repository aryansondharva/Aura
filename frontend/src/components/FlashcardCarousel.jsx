import React, { useState } from "react";
import { Modal, Carousel, Button } from "react-bootstrap";

const FlashcardCarousel = ({ topic, flashcards, show, onHide, isLoading }) => {
  const [index, setIndex] = useState(0);

  const handleSelect = (selectedIndex) => {
    setIndex(selectedIndex);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop="static"
      className="flashcard-carousel-modal"
    >
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title>
          Flashcards for <span className="grad_text">{topic.title}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-dark text-white text-center">
        {isLoading ? (
          <>
            <div className="spinner-border text-light mb-3" role="status" />
            <p>Generating flashcards...</p>
          </>
        ) : flashcards.length === 0 ? (
          <p>No flashcards available for this topic.</p>
        ) : (
          <>
            <Carousel
              activeIndex={index}
              onSelect={handleSelect}
              interval={null}
              indicators={true}
              controls={true}
            >
              {flashcards.map((card, idx) => (
                <Carousel.Item key={idx}>
                  <div className="p-4 bg-gray text-white flashcard-item">
                    <h5 className="mb-3">Core Concept</h5>
                    <p className="mb-4">{card.core_concept}</p>

                    <h5 className="mb-3">Key Theory</h5>
                    <p className="mb-4">{card.key_theory}</p>

                    {card.common_mistake && (
                      <>
                        <h5 className="mb-3 text-warning">Common Mistake</h5>
                        <p className="mb-4 text-warning">
                          {card.common_mistake}
                        </p>
                      </>
                    )}
                  </div>
                </Carousel.Item>
              ))}
            </Carousel>
            <div className="text-center mt-3">
              Card {index + 1} of {flashcards.length}
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer className="bg-dark">
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};


export default FlashcardCarousel;