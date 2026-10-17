package client

import (
	"errors"
	"testing"
	"time"
)

func TestDTOToModel(t *testing.T) {
	t.Run("parses leap day into UTC midnight", func(t *testing.T) {
		req := CreateRequest{
			Name:     "Иван",
			Surname:  "Иванов",
			Birthday: "2000-02-29",
			Gender:   string(Male),
		}

		got, err := DTOToModel(req)
		if err != nil {
			t.Fatalf("DTOToModel: %v", err)
		}

		want := time.Date(2000, time.February, 29, 0, 0, 0, 0, time.UTC)
		if !got.Birthday.Equal(want) {
			t.Fatalf("Birthday = %v, want %v", got.Birthday, want)
		}
		if got.Birthday.Location() != time.UTC {
			t.Fatalf("Birthday location = %v, want UTC", got.Birthday.Location())
		}
	})

	t.Run("returns ErrInvalidBirthday for nonexistent date", func(t *testing.T) {
		req := CreateRequest{
			Name:     "Иван",
			Surname:  "Иванов",
			Birthday: "2026-02-30",
			Gender:   string(Male),
		}

		_, err := DTOToModel(req)
		if !errors.Is(err, ErrInvalidBirthday) {
			t.Fatalf("err = %v, want ErrInvalidBirthday", err)
		}
	})
}
