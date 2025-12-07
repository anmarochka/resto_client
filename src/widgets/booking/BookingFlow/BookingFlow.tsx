import { useState } from "react"
import { RestaurantSelect } from "./RestaurantSelect"
import { DateTimeSelect } from "./DateTimeSelect"
import { FloorPlanView } from "./FloorPlanView"
import { BookingConfirmation } from "./BookingConfirmation"

interface BookingFlowProps {
  user: {
    id: number
    first_name: string
    last_name?: string
    username?: string
  } | null
}

type BookingStep = "restaurant" | "datetime" | "floor" | "confirmation"

export function BookingFlow({ user }: BookingFlowProps) {
  const [step, setStep] = useState<BookingStep>("restaurant")
  const [bookingData, setBookingData] = useState({
    restaurantId: "",
    date: "",
    time: "",
    guests: 2,
    tableId: "",
  })

  const handleRestaurantSelect = (restaurantId: string) => {
    setBookingData({ ...bookingData, restaurantId })
    setStep("datetime")
  }

  const handleDateTimeSelect = (date: string, time: string, guests: number) => {
    setBookingData({ ...bookingData, date, time, guests })
    setStep("floor")
  }

  const handleTableSelect = (tableId: string) => {
    setBookingData({ ...bookingData, tableId })
    setStep("confirmation")
  }

  const handleBack = () => {
    if (step === "datetime") setStep("restaurant")
    else if (step === "floor") setStep("datetime")
    else if (step === "confirmation") setStep("floor")
  }

  const handleBookingComplete = () => {
    setBookingData({
      restaurantId: "",
      date: "",
      time: "",
      guests: 2,
      tableId: "",
    })
    setStep("restaurant")
  }

  return (
    <div>
      {step === "restaurant" && <RestaurantSelect onSelect={handleRestaurantSelect} />}

      {step === "datetime" && (
        <DateTimeSelect
          restaurantId={bookingData.restaurantId}
          onSelect={handleDateTimeSelect}
          onBack={handleBack}
          initialGuests={bookingData.guests}
        />
      )}

      {step === "floor" && (
        <FloorPlanView
          restaurantId={bookingData.restaurantId}
          date={bookingData.date}
          time={bookingData.time}
          guests={bookingData.guests}
          onSelect={handleTableSelect}
          onBack={handleBack}
        />
      )}

      {step === "confirmation" && (
        <BookingConfirmation
          bookingData={bookingData}
          user={user}
          onBack={handleBack}
          onComplete={handleBookingComplete}
        />
      )}
    </div>
  )
}
